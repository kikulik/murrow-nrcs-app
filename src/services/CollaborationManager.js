// src/services/CollaborationManager.js

export class CollaborationManager {
    constructor(db, currentUser) {
        this.db = db;
        this.currentUser = currentUser;
        this.presenceRef = null;
        this.currentEditingItem = null;
        this.presenceInterval = null;
        this.presenceListenerUnsubscribe = null; // To hold the listener's unsubscribe function
        this.lastUpdate = 0;
        this.updateThrottle = 2000;
        this.cleanup = () => {};
    }

    async startPresenceTracking(rundownId) {
        if (!this.db || !this.currentUser || this.presenceRef) return;

        try {
            const { doc, setDoc, collection } = await import("firebase/firestore");
            const presenceCollection = collection(this.db, "presence");
            const presenceDoc = doc(presenceCollection, `${rundownId}_${this.currentUser.uid}`);
            this.presenceRef = presenceDoc;

            const presenceData = {
                userId: this.currentUser.uid,
                userName: this.currentUser.name,
                rundownId,
                lastSeen: new Date().toISOString(),
                isActive: true,
                editingItem: null
            };
            await setDoc(this.presenceRef, presenceData);

            this.presenceInterval = setInterval(async () => {
                if (!this.presenceRef) return;
                const now = Date.now();
                if (now - this.lastUpdate < this.updateThrottle) return;
                try {
                    await setDoc(this.presenceRef, {
                        lastSeen: new Date().toISOString(),
                        editingItem: this.currentEditingItem || null
                    }, { merge: true });
                    this.lastUpdate = now;
                } catch (error) {
                    console.error('Error updating presence:', error);
                }
            }, 3000);

            const handleBeforeUnload = () => this.stopPresenceTracking();
            window.addEventListener('beforeunload', handleBeforeUnload);
            this.cleanup = () => window.removeEventListener('beforeunload', handleBeforeUnload);

        } catch (error) {
            console.error('Error starting presence tracking:', error);
        }
    }

    async stopPresenceTracking() {
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
            this.presenceInterval = null;
        }

        // Unsubscribe from the listener first
        if (this.presenceListenerUnsubscribe) {
            this.presenceListenerUnsubscribe();
            this.presenceListenerUnsubscribe = null;
        }

        if (this.presenceRef) {
            try {
                const { deleteDoc } = await import("firebase/firestore");
                await deleteDoc(this.presenceRef);
                this.presenceRef = null;
            } catch (error) {
                // It's possible the doc is already gone or permissions are lost on logout.
                // Log the error but don't throw, as this is a cleanup operation.
                console.warn('Could not delete presence document on cleanup:', error.message);
            }
        }

        if (this.cleanup) {
            this.cleanup();
        }
    }

    async setEditingItem(itemId) {
        this.currentEditingItem = itemId;
        if (this.presenceRef) {
            try {
                const { updateDoc } = await import("firebase/firestore");
                await updateDoc(this.presenceRef, {
                    editingItem: itemId,
                    lastSeen: new Date().toISOString()
                });
                this.lastUpdate = Date.now();
            } catch (error) {
                console.error('Error updating editing item:', error);
            }
        }
    }

    async sendTakeOverNotification(itemId, previousUserId) {
        if (!previousUserId) return;
        try {
            const { collection, addDoc } = await import("firebase/firestore");
            await addDoc(collection(this.db, "notifications"), {
                userId: previousUserId,
                type: 'takeOver',
                message: `${this.currentUser.name} has taken over editing the item.`,
                itemId: itemId,
                timestamp: new Date().toISOString(),
                read: false
            });
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    async listenToPresence(rundownId, callback) {
        if (!this.db) return;
        // If there's an existing listener, stop it before starting a new one.
        if (this.presenceListenerUnsubscribe) {
            this.presenceListenerUnsubscribe();
        }
        try {
            const { collection, query, where, onSnapshot } = await import("firebase/firestore");
            const presenceQuery = query(
                collection(this.db, "presence"),
                where("rundownId", "==", rundownId)
            );
            // Store the unsubscribe function on the instance
            this.presenceListenerUnsubscribe = onSnapshot(presenceQuery, (snapshot) => {
                const activeUsers = snapshot.docs
                    .map(doc => doc.data())
                    .filter(data => {
                        if (!data.lastSeen) return false;
                        const lastSeen = new Date(data.lastSeen);
                        const minutesAgo = (new Date() - lastSeen) / (1000 * 60);
                        return minutesAgo < 5 && data.userId !== this.currentUser.uid;
                    })
                    .map(data => ({
                        userId: data.userId,
                        userName: data.userName,
                        editingItem: data.editingItem
                    }));
                callback(activeUsers);
            });
        } catch (error) {
            console.error('Error setting up presence listener:', error);
        }
    }

    static applyTextTransform(originalText, operations) {
        let result = originalText;
        let offset = 0;
        const sortedOps = [...operations].sort((a, b) => a.position - b.position);
        for (const op of sortedOps) {
            const pos = op.position + offset;
            switch (op.type) {
                case 'insert':
                    result = result.slice(0, pos) + op.text + result.slice(pos);
                    offset += op.text.length;
                    break;
                case 'delete':
                    result = result.slice(0, pos) + result.slice(pos + op.length);
                    offset -= op.length;
                    break;
                case 'replace':
                    result = result.slice(0, pos) + op.newText + result.slice(pos + op.oldLength);
                    offset += op.newText.length - op.oldLength;
                    break;
            }
        }
        return result;
    }

    static generateTextOperations(oldText, newText) {
        if (oldText === newText) return [];
        return [{
            type: 'replace',
            position: 0,
            oldLength: oldText.length,
            newText: newText,
            timestamp: Date.now()
        }];
    }

    async safeUpdateRundown(rundownId, updateFunction, retryCount = 3) {
        for (let attempt = 0; attempt < retryCount; attempt++) {
            try {
                const { doc, getDoc, updateDoc } = await import("firebase/firestore");
                const rundownRef = doc(this.db, "rundowns", rundownId);
                const rundownDoc = await getDoc(rundownRef);
                if (!rundownDoc.exists()) throw new Error("Rundown not found");
                const currentData = rundownDoc.data();
                const updatedData = updateFunction(currentData);
                const versionedData = {
                    ...updatedData,
                    version: (currentData.version || 1) + 1,
                    lastModified: new Date().toISOString(),
                    lastModifiedBy: this.currentUser.uid
                };
                await updateDoc(rundownRef, versionedData);
                return versionedData;
            } catch (error) {
                if (attempt === retryCount - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            }
        }
    }
}
