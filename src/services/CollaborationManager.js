// src/services/CollaborationManager.js
export class CollaborationManager {
    constructor(db, currentUser) {
        this.db = db;
        this.currentUser = currentUser;
        this.presenceRef = null;
        this.presenceListeners = new Map();
    }

    // Optimistic Locking
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

    // Conflict Resolution
    static detectConflict(localItem, serverItem) {
        if (!localItem.version || !serverItem.version) return false;
        return localItem.version < serverItem.version;
    }

    static resolveConflict(localItem, serverItem, strategy = 'server-wins') {
        switch (strategy) {
            case 'server-wins':
                return serverItem;
            case 'client-wins':
                return this.incrementVersion(localItem, localItem.lastModifiedBy);
            case 'merge':
                return this.mergeItems(localItem, serverItem);
            default:
                return serverItem;
        }
    }

    static mergeItems(localItem, serverItem) {
        // Simple merge strategy - take newer fields
        const localTime = new Date(localItem.lastModified || 0);
        const serverTime = new Date(serverItem.lastModified || 0);

        const merged = { ...serverItem };

        // Merge specific fields based on modification time
        if (localTime > serverTime) {
            if (localItem.title !== serverItem.title) merged.title = localItem.title;
            if (localItem.content !== serverItem.content) merged.content = localItem.content;
            if (localItem.duration !== serverItem.duration) merged.duration = localItem.duration;
        }

        return this.incrementVersion(merged, localItem.lastModifiedBy);
    }

    // User Presence Management
    async startPresenceTracking(rundownId) {
        if (!this.db || !this.currentUser) return;

        try {
            const { doc, setDoc, onSnapshot, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            const presenceDoc = doc(this.db, "presence", `${rundownId}_${this.currentUser.uid}`);

            // Set user presence
            await setDoc(presenceDoc, {
                userId: this.currentUser.uid,
                userName: this.currentUser.name,
                rundownId,
                lastSeen: new Date().toISOString(),
                isActive: true,
                editingItem: null
            });

            // Update presence every 30 seconds
            this.presenceInterval = setInterval(async () => {
                try {
                    await setDoc(presenceDoc, {
                        userId: this.currentUser.uid,
                        userName: this.currentUser.name,
                        rundownId,
                        lastSeen: new Date().toISOString(),
                        isActive: true,
                        editingItem: this.currentEditingItem || null
                    });
                } catch (error) {
                    console.error('Error updating presence:', error);
                }
            }, 30000);

            // Clean up on page unload
            window.addEventListener('beforeunload', () => {
                this.stopPresenceTracking();
            });

            this.presenceRef = presenceDoc;
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
            } catch (error) {
                console.error('Error stopping presence tracking:', error);
            }
        }
    }

    async setEditingItem(itemId) {
        this.currentEditingItem = itemId;

        if (this.presenceRef) {
            try {
                const { updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
                await updateDoc(this.presenceRef, {
                    editingItem: itemId,
                    lastSeen: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error updating editing item:', error);
            }
        }
    }

    listenToPresence(rundownId, callback) {
        if (!this.db) return () => { };

        try {
            const { collection, query, where, onSnapshot } = import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js").then(module => {
                const presenceQuery = query(
                    collection(this.db, "presence"),
                    where("rundownId", "==", rundownId)
                );

                return onSnapshot(presenceQuery, (snapshot) => {
                    const activeUsers = [];
                    const now = new Date();

                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        const lastSeen = new Date(data.lastSeen);
                        const minutesAgo = (now - lastSeen) / (1000 * 60);

                        // Consider users active if seen within last 2 minutes
                        if (minutesAgo < 2 && data.userId !== this.currentUser.uid) {
                            activeUsers.push({
                                ...data,
                                id: doc.id
                            });
                        }
                    });

                    callback(activeUsers);
                });
            });

            return presenceQuery;
        } catch (error) {
            console.error('Error listening to presence:', error);
            return () => { };
        }
    }

    // Operational Transforms for text editing
    static applyTextTransform(originalText, operations) {
        let result = originalText;
        let offset = 0;

        // Sort operations by position to apply them correctly
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
        // Simple diff algorithm - in production, use a proper diff library
        if (oldText === newText) return [];

        // For now, treat the entire change as a single replace operation
        return [{
            type: 'replace',
            position: 0,
            oldLength: oldText.length,
            newText: newText,
            timestamp: Date.now(),
            userId: this.currentUser?.uid
        }];
    }

    // Safe rundown update with conflict resolution
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

                // Add version control
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
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            }
        }
    }
}