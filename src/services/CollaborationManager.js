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
        this.updateThrottle = 2000;
        this.isOwner = false;
        this.lockTimeout = null;
    }

    static addVersionControl(item) {
        return {
            ...item,
            version: item.version || 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: item.lastModifiedBy || null,
            lockedBy: item.lockedBy || null,
            lockTimestamp: item.lockTimestamp || null
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
                editingItem: null,
                isOwner: false
            };

            await setDoc(presenceDoc, presenceData);

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
                        isOwner: this.isOwner
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

        if (this.currentEditingItem && this.isOwner) {
            await this.releaseLock(this.currentEditingItem);
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

    async acquireLock(itemId) {
        try {
            const { doc, getDoc, setDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            const lockDoc = doc(this.db, "itemLocks", itemId);
            const lockSnapshot = await getDoc(lockDoc);

            const now = new Date().toISOString();
            const lockExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

            if (lockSnapshot.exists()) {
                const lockData = lockSnapshot.data();
                const lockAge = new Date() - new Date(lockData.timestamp);
                
                if (lockData.userId === this.currentUser.uid) {
                    await updateDoc(lockDoc, {
                        timestamp: now,
                        expiresAt: lockExpiry
                    });
                    this.isOwner = true;
                    return true;
                }

                if (lockAge < 10 * 60 * 1000) {
                    this.isOwner = false;
                    return false;
                }
            }

            await setDoc(lockDoc, {
                userId: this.currentUser.uid,
                userName: this.currentUser.name,
                itemId: itemId,
                timestamp: now,
                expiresAt: lockExpiry
            });

            this.isOwner = true;
            this.renewLockTimer(itemId);
            return true;

        } catch (error) {
            console.error('Error acquiring lock:', error);
            return false;
        }
    }

    async releaseLock(itemId) {
        try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
            
            if (this.lockTimeout) {
                clearTimeout(this.lockTimeout);
                this.lockTimeout = null;
            }

            await deleteDoc(doc(this.db, "itemLocks", itemId));
            this.isOwner = false;
        } catch (error) {
            console.error('Error releasing lock:', error);
        }
    }

    renewLockTimer(itemId) {
        if (this.lockTimeout) {
            clearTimeout(this.lockTimeout);
        }

        this.lockTimeout = setTimeout(async () => {
            if (this.isOwner && this.currentEditingItem === itemId) {
                const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
                try {
                    await updateDoc(doc(this.db, "itemLocks", itemId), {
                        timestamp: new Date().toISOString(),
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
                    });
                    this.renewLockTimer(itemId);
                } catch (error) {
                    console.error('Error renewing lock:', error);
                }
            }
        }, 5 * 60 * 1000);
    }

    async setEditingItem(itemId) {
        if (this.currentEditingItem && this.currentEditingItem !== itemId) {
            await this.releaseLock(this.currentEditingItem);
        }

        this.currentEditingItem = itemId;

        if (itemId) {
            const lockAcquired = await this.acquireLock(itemId);
            if (!lockAcquired) {
                this.isOwner = false;
            }
        }

        if (this.presenceRef) {
            try {
                const { updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
                await updateDoc(this.presenceRef, {
                    editingItem: itemId,
                    isOwner: this.isOwner,
                    lastSeen: new Date().toISOString()
                });
                this.lastUpdate = Date.now();
            } catch (error) {
                console.error('Error updating editing item:', error);
            }
        }
    }

    async takeOverItem(itemId, previousUserId) {
        try {
            const { collection, addDoc, query, where, getDocs, doc, setDoc, deleteDoc } = 
                await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            await deleteDoc(doc(this.db, "itemLocks", itemId));

            const lockAcquired = await this.acquireLock(itemId);
            if (!lockAcquired) {
                return false;
            }

            await this.setEditingItem(itemId);

            const presenceQuery = query(
                collection(this.db, "presence"),
                where("userId", "==", previousUserId)
            );
            
            const presenceSnapshot = await getDocs(presenceQuery);
            
            if (!presenceSnapshot.empty) {
                const { updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
                presenceSnapshot.forEach(async (docSnapshot) => {
                    await updateDoc(doc(this.db, "presence", docSnapshot.id), {
                        editingItem: null,
                        isOwner: false,
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

                    if (minutesAgo < 5 && data.userId !== this.currentUser.uid) {
                        activeUsers.push({
                            userId: data.userId,
                            userName: data.userName,
                            editingItem: data.editingItem,
                            isOwner: data.isOwner || false
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

    async listenToItemLock(itemId, callback) {
        if (!this.db) return () => {};

        try {
            const { doc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            const lockDoc = doc(this.db, "itemLocks", itemId);

            return onSnapshot(lockDoc, (snapshot) => {
                if (snapshot.exists()) {
                    const lockData = snapshot.data();
                    const isCurrentUserOwner = lockData.userId === this.currentUser.uid;
                    
                    callback({
                        locked: true,
                        ownedByCurrentUser: isCurrentUserOwner,
                        owner: {
                            userId: lockData.userId,
                            userName: lockData.userName
                        },
                        timestamp: lockData.timestamp
                    });
                } else {
                    callback({
                        locked: false,
                        ownedByCurrentUser: false,
                        owner: null,
                        timestamp: null
                    });
                }
            });
        } catch (error) {
            console.error('Error setting up lock listener:', error);
            return () => {};
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
