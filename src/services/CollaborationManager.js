// src/services/CollaborationManager.js
export class CollaborationManager {
    constructor(db, currentUser) {
        this.db = db;
        this.currentUser = currentUser;
        this.presenceRef = null;
        this.presenceListeners = new Map();
        this.currentEditingItem = null;
        this.presenceInterval = null;
        this.lastUpdate = 0;
        this.updateThrottle = 2000; // Throttle updates to prevent rapid changes
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
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            const presenceDoc = doc(this.db, "presence", `${rundownId}_${this.currentUser.uid}`);

            const presenceData = {
                userId: this.currentUser.uid,
                userName: this.currentUser.name,
                rundownId,
                lastSeen: new Date().toISOString(),
                isActive: true,
                editingItem: null
            };

            await setDoc(presenceDoc, presenceData);

            // Reduced frequency to prevent rapid updates
            this.presenceInterval = setInterval(async () => {
                const now = Date.now();
                if (now - this.lastUpdate < this.updateThrottle) {
                    return; // Skip update if too soon
                }

                try {
                    await setDoc(presenceDoc, {
                        ...presenceData,
                        lastSeen: new Date().toISOString(),
                        editingItem: this.currentEditingItem || null
                    });
                    this.lastUpdate = now;
                } catch (error) {
                    console.error('Error updating presence:', error);
                }
            }, 5000); // Increased to 5 seconds

            const handleBeforeUnload = () => {
                this.stopPresenceTracking();
            };

            window.addEventListener('beforeunload', handleBeforeUnload);

            this.presenceRef = presenceDoc;
            this.cleanup = () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
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
        // Throttle editing item updates
        const now = Date.now();
        if (this.currentEditingItem === itemId && now - this.lastUpdate < this.updateThrottle) {
            return;
        }

        this.currentEditingItem = itemId;

        if (this.presenceRef) {
            try {
                const { updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
                await updateDoc(this.presenceRef, {
                    editingItem: itemId,
                    lastSeen: new Date().toISOString()
                });
                this.lastUpdate = now;
            } catch (error) {
                console.error('Error updating editing item:', error);
            }
        }
    }

    async takeOverItem(itemId, previousUserId) {
        try {
            const { doc, updateDoc, collection, query, where, getDocs, addDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            const presenceQuery = query(
                collection(this.db, "presence"),
                where("userId", "==", previousUserId)
            );

            const presenceDocs = await getDocs(presenceQuery);

            // Clear all editing items for previous user
            for (const presenceDoc of presenceDocs.docs) {
                await updateDoc(presenceDoc.ref, {
                    editingItem: null,
                    lastSeen: new Date().toISOString()
                });
            }

            // Set current user as editor
            await this.setEditingItem(itemId);

            // Send notification
            await addDoc(collection(this.db, "notifications"), {
                userId: previousUserId,
                type: 'takeOver',
                message: `${this.currentUser.name} has taken over editing the story you were working on.`,
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

            let lastSnapshot = null;

            return onSnapshot(presenceQuery, (snapshot) => {
                // Prevent rapid updates by comparing snapshots
                if (lastSnapshot && this.snapshotsEqual(lastSnapshot, snapshot)) {
                    return;
                }
                lastSnapshot = snapshot;

                const activeUsers = [];
                const now = new Date();

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (!data.lastSeen) return;

                    const lastSeen = new Date(data.lastSeen);
                    const minutesAgo = (now - lastSeen) / (1000 * 60);

                    // Increased tolerance to 5 minutes for same-PC testing
                    if (minutesAgo < 5 && data.userId !== this.currentUser.uid) {
                        activeUsers.push({
                            ...data,
                            id: doc.id
                        });
                    }
                });

                // Debounce callback to prevent rapid UI updates
                setTimeout(() => {
                    callback(activeUsers);
                }, 200);
            });
        } catch (error) {
            console.error('Error setting up presence listener:', error);
            return () => { };
        }
    }

    // Helper to compare snapshots and prevent unnecessary updates
    snapshotsEqual(snap1, snap2) {
        if (snap1.size !== snap2.size) return false;

        const docs1 = snap1.docs.map(doc => ({ id: doc.id, data: doc.data() }));
        const docs2 = snap2.docs.map(doc => ({ id: doc.id, data: doc.data() }));

        return JSON.stringify(docs1) === JSON.stringify(docs2);
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
