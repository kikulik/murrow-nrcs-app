export class CollaborationManager {
    constructor(db, currentUser) {
        this.db = db;
        this.currentUser = currentUser;
        this.presenceRef = null;
        this.presenceListeners = new Map();
        this.currentEditingItem = null;
        this.presenceInterval = null;
        this.lastUpdate = 0;
        this.updateThrottle = 2000;
        this.activeEditors = new Map();
    }

    static addVersionControl(item) {
        return {
            ...item,
            version: item.version || 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: item.lastModifiedBy || null
        };
    }

    static incrementVersion(item, userId) {
        return {
            ...item,
            version: (item.version || 1) + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userId
        };
    }

    async startPresenceTracking(rundownId) {
        if (!this.db || !this.currentUser || this.presenceRef) return;

        try {
            const { doc, setDoc, onSnapshot, collection, query, where } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            const presenceDoc = doc(this.db, "presence", `${rundownId}_${this.currentUser.uid}`);

            const presenceData = {
                userId: this.currentUser.uid,
                userName: this.currentUser.name,
                rundownId,
                lastSeen: new Date().toISOString(),
                isActive: true,
                editingItem: null,
                isActuallyEditing: false
            };

            await setDoc(presenceDoc, presenceData);

            const takeOverQuery = query(
                collection(this.db, "takeOverRequests"),
                where("targetUserId", "==", this.currentUser.uid)
            );

            const takeOverUnsubscribe = onSnapshot(takeOverQuery, (snapshot) => {
                snapshot.docs.forEach(async (docSnapshot) => {
                    const takeOverData = docSnapshot.data();
                    if (takeOverData.itemId === this.currentEditingItem && takeOverData.status === 'pending') {
                        await this.handleForcedTakeOver(takeOverData);

                        const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
                        await deleteDoc(docSnapshot.ref);
                    }
                });
            });

            this.presenceInterval = setInterval(async () => {
                const now = Date.now();
                if (now - this.lastUpdate < this.updateThrottle) {
                    return;
                }

                try {
                    await setDoc(presenceDoc, {
                        ...presenceData,
                        lastSeen: new Date().toISOString(),
                        editingItem: this.currentEditingItem || null,
                        isActuallyEditing: this.currentEditingItem !== null
                    }, { merge: true });
                    this.lastUpdate = now;
                } catch (error) {
                    console.error('Error updating presence:', error);
                }
            }, 3000);

            const handleBeforeUnload = () => {
                this.stopPresenceTracking();
            };

            window.addEventListener('beforeunload', handleBeforeUnload);

            this.presenceRef = presenceDoc;
            this.takeOverUnsubscribe = takeOverUnsubscribe;
            this.cleanup = () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
                if (this.takeOverUnsubscribe) {
                    this.takeOverUnsubscribe();
                }
            };
        } catch (error) {
            console.error('Error starting presence tracking:', error);
        }
    }

    async stopPresenceTracking() {
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
            this.presenceInterval = null;
        }

        if (this.presenceRef) {
            try {
                const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
                await deleteDoc(this.presenceRef);
                this.presenceRef = null;
            } catch (error) {
                console.error('Error stopping presence tracking:', error);
            }
        }

        if (this.cleanup) {
            this.cleanup();
        }
    }

    async setEditingItem(itemId) {
        const previousItem = this.currentEditingItem;
        this.currentEditingItem = itemId;

        if (this.presenceRef) {
            try {
                const { updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
                await updateDoc(this.presenceRef, {
                    editingItem: itemId,
                    isActuallyEditing: itemId !== null,
                    lastSeen: new Date().toISOString()
                });
                this.lastUpdate = Date.now();
            } catch (error) {
                console.error('Error updating editing item:', error);
            }
        }

        if (itemId) {
            this.activeEditors.set(itemId, this.currentUser.uid);
        } else if (previousItem) {
            this.activeEditors.delete(previousItem);
        }
    }

    async handleForcedTakeOver(takeOverData) {
        const event = new CustomEvent('forcedTakeOver', {
            detail: {
                itemId: takeOverData.itemId,
                newUserId: takeOverData.requestingUserId,
                newUserName: takeOverData.requestingUserName
            }
        });
        window.dispatchEvent(event);
    }

    async takeOverItem(itemId, previousUserId) {
        try {
            const { collection, addDoc, query, where, getDocs, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            const takeOverRequest = {
                itemId: itemId,
                requestingUserId: this.currentUser.uid,
                requestingUserName: this.currentUser.name,
                targetUserId: previousUserId,
                status: 'pending',
                timestamp: new Date().toISOString()
            };

            await addDoc(collection(this.db, "takeOverRequests"), takeOverRequest);

            await this.setEditingItem(itemId);

            const presenceQuery = query(
                collection(this.db, "presence"),
                where("userId", "==", previousUserId)
            );

            const presenceSnapshot = await getDocs(presenceQuery);

            if (!presenceSnapshot.empty) {
                presenceSnapshot.forEach(async (docSnapshot) => {
                    await updateDoc(doc(this.db, "presence", docSnapshot.id), {
                        editingItem: null,
                        isActuallyEditing: false,
                        lastSeen: new Date().toISOString()
                    });
                });
            }

            await addDoc(collection(this.db, "notifications"), {
                userId: previousUserId,
                type: 'takeOver',
                message: `${this.currentUser.name} has taken over editing the item you were working on.`,
                itemId: itemId,
                timestamp: new Date().toISOString(),
                read: false
            });

            return true;
        } catch (error) {
            console.error('Error taking over item:', error);
            return false;
        }
    }

    async listenToPresence(rundownId, callback) {
        if (!this.db) return () => { };

        try {
            const { collection, query, where, onSnapshot } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            const presenceQuery = query(
                collection(this.db, "presence"),
                where("rundownId", "==", rundownId)
            );

            let lastActiveUsersState = '[]';

            return onSnapshot(presenceQuery, (snapshot) => {
                const activeUsers = [];
                const now = new Date();

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (!data.lastSeen) return;

                    const lastSeen = new Date(data.lastSeen);
                    const minutesAgo = (now - lastSeen) / (1000 * 60);

                    if (minutesAgo < 3 && data.userId !== this.currentUser.uid) {
                        activeUsers.push({
                            userId: data.userId,
                            userName: data.userName,
                            editingItem: data.isActuallyEditing ? data.editingItem : null
                        });
                    }
                });

                const newActiveUsersState = JSON.stringify(activeUsers);

                if (newActiveUsersState !== lastActiveUsersState) {
                    lastActiveUsersState = newActiveUsersState;
                    callback(activeUsers);
                }
            });
        } catch (error) {
            console.error('Error setting up presence listener:', error);
            return () => { };
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
            timestamp: Date.now(),
            userId: this.currentUser?.uid
        }];
    }

    async safeUpdateRundown(rundownId, updateFunction, retryCount = 3) {
        for (let attempt = 0; attempt < retryCount; attempt++) {
            try {
                const { doc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

                const rundownRef = doc(this.db, "rundowns", rundownId);
                const rundownDoc = await getDoc(rundownRef);

                if (!rundownDoc.exists()) {
                    throw new Error("Rundown not found");
                }

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
                if (attempt === retryCount - 1) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            }
        }
    }
}
