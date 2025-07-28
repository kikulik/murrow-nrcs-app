// src/services/CollaborationManager.js (Fixed Real-time)
export class CollaborationManager {
    constructor(db, currentUser) {
        this.db = db;
        this.currentUser = currentUser;
        this.presenceRef = null;
        this.currentEditingItem = null;
        this.presenceInterval = null;
        this.presenceListenerUnsubscribe = null;
        this.lastUpdate = 0;
        this.updateThrottle = 500;
        this.cleanup = () => { };
        this.isDestroyed = false;
    }

    async startPresenceTracking(rundownId) {
        if (!this.db || !this.currentUser) {
            console.error('Cannot start presence tracking: missing db or currentUser');
            return;
        }

        if (this.isDestroyed) {
            console.error('Cannot start presence tracking: instance is destroyed');
            return;
        }

        if (this.presenceRef) {
            await this.stopPresenceTracking();
        }

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
                editingItem: this.currentEditingItem
            };

            await setDoc(this.presenceRef, presenceData, { merge: true });

            this.presenceInterval = setInterval(async () => {
                if (!this.presenceRef || this.isDestroyed) return;

                const now = Date.now();
                if (now - this.lastUpdate < this.updateThrottle) return;

                try {
                    const { updateDoc } = await import("firebase/firestore");
                    const updateData = {
                        lastSeen: new Date().toISOString(),
                        editingItem: this.currentEditingItem || null,
                        isActive: true
                    };
                    await updateDoc(this.presenceRef, updateData);
                    this.lastUpdate = now;
                } catch (error) {
                    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
                        console.warn('User appears to be logged out, stopping presence tracking');
                        this.stopPresenceTracking();
                        return;
                    }
                    console.error('Error updating presence:', error);
                }
            }, 1000);

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

        if (this.presenceListenerUnsubscribe) {
            try {
                this.presenceListenerUnsubscribe();
            } catch (error) {
                console.warn('Error unsubscribing from presence listener:', error);
            }
            this.presenceListenerUnsubscribe = null;
        }

        if (this.presenceRef) {
            const refToDelete = this.presenceRef;
            this.presenceRef = null;
            try {
                const { deleteDoc } = await import("firebase/firestore");
                await deleteDoc(refToDelete);
            } catch (error) {
                console.warn('Could not delete presence document on cleanup (this is expected on logout):', error.message);
            }
        }

        if (this.cleanup) {
            try {
                this.cleanup();
            } catch (error) {
                console.warn('Error during cleanup function:', error);
            }
            this.cleanup = () => { };
        }

        this.isDestroyed = true;
    }

    async setEditingItem(itemId) {
        if (this.isDestroyed) {
            console.warn('Cannot set editing item: instance is destroyed');
            return;
        }

        this.currentEditingItem = itemId;
        console.log('Setting editing item to:', itemId);
        
        if (this.presenceRef) {
            try {
                // FIX: Import deleteField and use it to explicitly remove the editingItem field
                // when a user stops editing. This is a more robust signal than setting it to null.
                const { updateDoc, deleteField } = await import("firebase/firestore");
                
                const updateData = {
                    lastSeen: new Date().toISOString(),
                    isActive: true,
                    // Conditionally add or delete the editingItem field
                    editingItem: itemId ? itemId : deleteField()
                };

                await updateDoc(this.presenceRef, updateData);
                this.lastUpdate = Date.now();
                console.log('Updated presence with editing item:', itemId);
            } catch (error) {
                if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
                    console.warn('User appears to be logged out, cannot update editing item');
                    return;
                }
                console.error('Error updating editing item:', error);
            }
        }
    }

    async sendTakeOverNotification(itemId, previousUserId) {
        if (!previousUserId || this.isDestroyed) return;
        try {
            console.log('Sending takeover notification to user:', previousUserId, 'for item:', itemId);
            const { collection, addDoc } = await import("firebase/firestore");
            
            const notificationData = {
                userId: previousUserId,
                type: 'takeOver',
                message: `${this.currentUser.name} has taken over editing the item.`,
                itemId: itemId.toString(),
                timestamp: new Date().toISOString(),
                read: false,
                takenOverBy: this.currentUser.uid,
                takenOverByName: this.currentUser.name
            };
            
            const docRef = await addDoc(collection(this.db, "notifications"), notificationData);
            console.log('Takeover notification sent with ID:', docRef.id);
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    async listenToPresence(rundownId, callback) {
        if (!this.db || this.isDestroyed) return;

        if (this.presenceListenerUnsubscribe) {
            try {
                this.presenceListenerUnsubscribe();
            } catch (error) {
                console.warn('Error cleaning up previous presence listener:', error);
            }
        }

        try {
            const { collection, query, where, onSnapshot } = await import("firebase/firestore");
            const presenceQuery = query(
                collection(this.db, "presence"),
                where("rundownId", "==", rundownId)
            );

            this.presenceListenerUnsubscribe = onSnapshot(
                presenceQuery,
                (snapshot) => {
                    if (this.isDestroyed) return;
                    
                    const allActiveUsers = snapshot.docs
                        .map(doc => doc.data())
                        .filter(data => {
                            if (!data.lastSeen) return false;
                            const lastSeen = new Date(data.lastSeen);
                            const minutesAgo = (new Date() - lastSeen) / (1000 * 60);
                            return minutesAgo < 2;
                        })
                        .map(data => ({
                            userId: data.userId,
                            userName: data.userName,
                            editingItem: data.editingItem
                        }));
                    
                    callback(allActiveUsers);
                },
                (error) => {
                    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
                        console.warn('User appears to be logged out, stopping presence listener');
                        return;
                    }
                    console.error('Error in presence listener:', error);
                }
            );
        } catch (error) {
            console.error('Error setting up presence listener:', error);
        }
    }

    generateTextOperations(oldText, newText) {
        if (oldText === newText) return [];
        return [{
            type: 'replace',
            position: 0,
            oldLength: oldText.length,
            newText: newText,
            timestamp: Date.now()
        }];
    }

    applyTextTransform(originalText, operations) {
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

    async clearPreviousUserEditingState(previousUserId, itemId) {
        if (this.isDestroyed) return;

        try {
            console.log('Clearing editing state for user:', previousUserId, 'item:', itemId);
            const { collection, query, where, getDocs, updateDoc } = await import("firebase/firestore");
            
            const presenceQuery = query(
                collection(this.db, "presence"),
                where("userId", "==", previousUserId)
            );
            
            const presenceSnapshot = await getDocs(presenceQuery);
            
            const updatePromises = presenceSnapshot.docs.map(doc => {
                const data = doc.data();
                if (data.editingItem === itemId.toString()) {
                    console.log('Clearing editing item for presence doc:', doc.id);
                    return updateDoc(doc.ref, {
                        editingItem: null,
                        lastSeen: new Date().toISOString()
                    });
                }
                return Promise.resolve();
            });
            
            await Promise.all(updatePromises);
            console.log('Successfully cleared previous user editing state');
            
        } catch (error) {
            console.error('Error clearing previous user editing state:', error);
        }
    }

    async safeUpdateRundown(rundownId, updateFunction, retryCount = 3) {
        if (this.isDestroyed) return null;

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
                if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
                    console.warn('User appears to be logged out, cannot update rundown');
                    return null;
                }
                if (attempt === retryCount - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            }
        }
    }
}
