// src/services/CollaborationManager.js
export class CollaborationManager {
    constructor(db, currentUser) {
        this.db = db;
        this.currentUser = currentUser;
        this.presenceRef = null;
        this.presenceListeners = new Map();
        this.currentEditingItem = null;
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

    // User Presence Management
    async startPresenceTracking(rundownId) {
        if (!this.db || !this.currentUser) return;

        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

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

    async takeOverItem(itemId, previousUserId) {
        try {
            // Clear the previous user's editing status
            const { doc, updateDoc, collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            const presenceQuery = query(
                collection(this.db, "presence"),
                where("userId", "==", previousUserId),
                where("editingItem", "==", itemId)
            );

            const presenceDocs = await getDocs(presenceQuery);

            // Clear previous user's editing status
            presenceDocs.forEach(async (presenceDoc) => {
                await updateDoc(presenceDoc.ref, {
                    editingItem: null,
                    lastSeen: new Date().toISOString()
                });
            });

            // Set current user as editor
            await this.setEditingItem(itemId);

            // Send notification to previous user
            if (this.db) {
                const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

                await addDoc(collection(this.db, "notifications"), {
                    userId: previousUserId,
                    type: 'takeOver',
                    message: `${this.currentUser.name} has taken over editing the story you were working on.`,
                    itemId: itemId,
                    timestamp: new Date().toISOString(),
                    read: false
                });
            }

            return true;
        } catch (error) {
            console.error('Error taking over item:', error);
            return false;
        }
    }

    listenToPresence(rundownId, callback) {
        if (!this.db) return () => { };

        const setupListener = async () => {
            try {
                const { collection, query, where, onSnapshot } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

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
            } catch (error) {
                console.error('Error setting up presence listener:', error);
                return () => { };
            }
        };

        return setupListener();
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
