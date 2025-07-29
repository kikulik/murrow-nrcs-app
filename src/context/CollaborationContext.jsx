// src/context/CollaborationContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useAppContext } from './AppContext';
import { CollaborationManager } from '../services/CollaborationManager';

const CollaborationContext = createContext();

export const CollaborationProvider = ({ children }) => {
    const { currentUser, db } = useAuth();
    const { appState, setAppState, openStoryTab, updateStoryTab, forceCloseStoryTab, refreshStoryTabData } = useAppContext();
    const [activeUsers, setActiveUsers] = useState([]);
    const [editingSessions, setEditingSessions] = useState(new Map());
    const [notifications, setNotifications] = useState([]);
    const collaborationManagerRef = useRef(null);
    const notificationsUnsubscribeRef = useRef(null);
    const presenceInitialized = useRef(false);
    const processedNotifications = useRef(new Set());
    const takingOverItemRef = useRef(null);
    const managerInitialized = useRef(false);

    // FIX: Enhanced manager initialization
    const ensureManagerInitialized = useCallback(async () => {
        if (!db || !currentUser) {
            console.log('Cannot initialize manager: missing db or currentUser');
            return false;
        }

        if (!collaborationManagerRef.current || collaborationManagerRef.current.isDestroyed) {
            console.log('Initializing new CollaborationManager');
            collaborationManagerRef.current = new CollaborationManager(db, currentUser);
            managerInitialized.current = true;
            
            // Start presence tracking if we have an active rundown
            if (appState.activeRundownId && !presenceInitialized.current) {
                console.log('Starting presence tracking during manager initialization');
                presenceInitialized.current = true;
                await collaborationManagerRef.current.startPresenceTracking(appState.activeRundownId);
                collaborationManagerRef.current.listenToPresence(
                    appState.activeRundownId,
                    (allUsers) => {
                        setActiveUsers(allUsers);
                        updateEditingSessions(allUsers);
                    }
                );
            }
        }
        return true;
    }, [db, currentUser, appState.activeRundownId]);

    useEffect(() => {
        if (db && currentUser) {
            ensureManagerInitialized();
        } else {
            if (collaborationManagerRef.current && !collaborationManagerRef.current.isDestroyed) {
                collaborationManagerRef.current.stopPresenceTracking();
            }
            collaborationManagerRef.current = null;
            managerInitialized.current = false;
            presenceInitialized.current = false;
        }
    }, [db, currentUser, ensureManagerInitialized]);

    useEffect(() => {
        if (!currentUser) {
            if (collaborationManagerRef.current && !collaborationManagerRef.current.isDestroyed) {
                collaborationManagerRef.current.stopPresenceTracking();
            }
            collaborationManagerRef.current = null;

            if (notificationsUnsubscribeRef.current) {
                try {
                    notificationsUnsubscribeRef.current();
                } catch (error) {
                    console.warn('Error cleaning up notifications listener:', error);
                }
                notificationsUnsubscribeRef.current = null;
            }

            setActiveUsers([]);
            setEditingSessions(new Map());
            setNotifications([]);
            managerInitialized.current = false;
            presenceInitialized.current = false;
            processedNotifications.current.clear();
        }
    }, [currentUser]);

    const markNotificationAsRead = useCallback(async (notificationId) => {
        if (!db || !notificationId) return;
        try {
            await updateDoc(doc(db, "notifications", notificationId), { read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, [db]);

    const clearAllNotifications = useCallback(async () => {
        if (!db || !currentUser) return;
        try {
            const notificationsQuery = query(
                collection(db, "notifications"),
                where("userId", "==", currentUser.uid),
                where("read", "==", false)
            );
            const snapshot = await getDocs(notificationsQuery);
            
            const deletePromises = snapshot.docs.map(docSnapshot => 
                deleteDoc(doc(db, "notifications", docSnapshot.id))
            );
            
            await Promise.all(deletePromises);
            setNotifications([]);
        } catch (error) {
            console.error('Error clearing all notifications:', error);
        }
    }, [db, currentUser]);

    const handleTakeOverNotification = useCallback(async (notification) => {
        if (!notification || notification.type !== 'takeOver' || processedNotifications.current.has(notification.id)) {
            return;
        }

        processedNotifications.current.add(notification.id);
        console.log('Processing takeover notification for item:', notification.itemId);
        
        try {
            await markNotificationAsRead(notification.id);
            forceCloseStoryTab(notification.itemId, true);
            
            setEditingSessions(prevSessions => {
                const newSessions = new Map(prevSessions);
                newSessions.delete(notification.itemId.toString());
                return newSessions;
            });
            
            console.log('Takeover notification processed successfully - tab closed');
        } catch (error) {
            console.error('Error processing takeover notification:', error);
        }
    }, [markNotificationAsRead, forceCloseStoryTab]);

    const setupNotificationListener = useCallback(async () => {
        if (!db || !currentUser || notificationsUnsubscribeRef.current) return;

        console.log('Setting up notification listener for user:', currentUser.uid);

        try {
            const notificationsQuery = query(
                collection(db, "notifications"),
                where("userId", "==", currentUser.uid),
                where("read", "==", false)
            );

            notificationsUnsubscribeRef.current = onSnapshot(
                notificationsQuery,
                (snapshot) => {
                    try {
                        const allUserNotifications = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        
                        const unreadNotifications = allUserNotifications.filter(n => n.read === false);
                        unreadNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        setNotifications(unreadNotifications);
                        
                        const newNotifications = unreadNotifications.filter(n => 
                            !processedNotifications.current.has(n.id)
                        );
                        
                        newNotifications.forEach(notification => {
                            if (notification.type === 'takeOver') {
                                handleTakeOverNotification(notification);
                            }
                        });
                    } catch (error) {
                        console.error('Error processing notifications:', error);
                    }
                },
                (error) => {
                    console.error('Notifications listener error:', error);
                }
            );
        } catch (error) {
            console.error('Error setting up notification listener:', error);
        }
    }, [db, currentUser, handleTakeOverNotification]);

    useEffect(() => {
        if (currentUser && db) {
            setupNotificationListener();
        }

        return () => {
            if (notificationsUnsubscribeRef.current) {
                try {
                    notificationsUnsubscribeRef.current();
                } catch (error) {
                    console.warn('Error cleaning up notifications listener on unmount:', error);
                }
                notificationsUnsubscribeRef.current = null;
            }
        };
    }, [setupNotificationListener, currentUser, db]);

    const updateEditingSessions = useCallback((users) => {
        if (!currentUser) return;

        const sessions = new Map();
        const myOpenTabs = new Set(appState.editingStoryTabs.map(t => t.itemId.toString()));

        users.forEach(user => {
            if (user.editingItem) {
                const itemIdStr = user.editingItem.toString();
                sessions.set(itemIdStr, {
                    userId: user.userId,
                    userName: user.userName,
                    timestamp: Date.now()
                });

                if (myOpenTabs.has(itemIdStr) && user.userId !== currentUser.uid && takingOverItemRef.current !== itemIdStr) {
                    console.log(`Proactive takeover detected for item ${itemIdStr} by ${user.userName}`);
                    updateStoryTab(itemIdStr, { isBeingTakenOver: true });
                }
            }
        });
        
        setEditingSessions(prevSessions => {
            if (prevSessions.size !== sessions.size) {
                return sessions;
            }
            
            let hasChanged = false;
            for (const [key, value] of sessions) {
                const prevValue = prevSessions.get(key);
                if (!prevValue || prevValue.userId !== value.userId) {
                    hasChanged = true;
                    break;
                }
            }
            
            return hasChanged ? sessions : prevSessions;
        });
    }, [appState.editingStoryTabs, currentUser, updateStoryTab]);

    useEffect(() => {
        const setupPresenceTracking = async () => {
            if (!appState.activeRundownId || !currentUser) {
                presenceInitialized.current = false;
                return;
            }

            // Ensure manager is initialized
            const managerReady = await ensureManagerInitialized();
            if (!managerReady) return;

            const manager = collaborationManagerRef.current;
            
            try {
                if (manager && !manager.isDestroyed && !presenceInitialized.current) {
                    console.log('Starting presence tracking for rundown:', appState.activeRundownId);
                    presenceInitialized.current = true;
                    await manager.startPresenceTracking(appState.activeRundownId);
                    manager.listenToPresence(
                        appState.activeRundownId,
                        (allUsers) => {
                            setActiveUsers(allUsers);
                            updateEditingSessions(allUsers);
                        }
                    );
                }
            } catch (error) {
                console.error('Error in presence tracking setup:', error);
                presenceInitialized.current = false;
            }
        };

        setupPresenceTracking();

        return () => {
            try {
                const manager = collaborationManagerRef.current;
                if (manager && !manager.isDestroyed && presenceInitialized.current) {
                    manager.stopPresenceTracking();
                    presenceInitialized.current = false;
                }
            } catch (error) {
                console.error('Error cleaning up presence tracking:', error);
            }
        };
    }, [appState.activeRundownId, currentUser, ensureManagerInitialized, updateEditingSessions]);

    const startEditingStory = async (itemId, storyData) => {
        try {
            if (!itemId || !storyData || !currentUser) {
                console.error('Missing required parameters for startEditingStory');
                return false;
            }

            // FIX: Ensure manager is initialized before using
            const managerReady = await ensureManagerInitialized();
            if (!managerReady) {
                console.error('Failed to initialize collaboration manager');
                return false;
            }

            const manager = collaborationManagerRef.current;
            if (!manager) {
                console.error('CollaborationManager is still not available');
                return false;
            }
        
            const editingUser = editingSessions.get(itemId.toString());
            const isBeingEditedByOther = editingUser && editingUser.userId !== currentUser.uid;

            if (isBeingEditedByOther) {
                console.log('Item is being edited by another user, opening in read-only mode');
                if (openStoryTab) {
                    openStoryTab(itemId, storyData);
                }
                if (updateStoryTab) {
                    updateStoryTab(itemId, {
                        isOwner: false,
                        takenOver: true,
                        takenOverBy: editingUser.userName,
                    });
                }
            } else {
                console.log('Opening item for editing');
                await manager.setEditingItem(itemId.toString());
                if (openStoryTab) {
                    openStoryTab(itemId, storyData);
                }
                if (updateStoryTab) {
                    updateStoryTab(itemId, {
                        isOwner: true,
                        takenOver: false,
                        takenOverBy: null,
                    });
                }
            }
            return true;
        } catch (error) {
            console.error('Error in startEditingStory:', error);
            return false;
        }
    };

    const stopEditingStory = async (itemId) => {
        // FIX: Ensure manager exists before using
        await ensureManagerInitialized();
        const manager = collaborationManagerRef.current;
        
        if (manager && !manager.isDestroyed) {
            const editingUser = editingSessions.get(itemId?.toString());
            if (editingUser && editingUser.userId === currentUser.uid) {
                await manager.setEditingItem(null);
                setEditingSessions(prevSessions => {
                    const newSessions = new Map(prevSessions);
                    newSessions.delete(itemId?.toString());
                    return newSessions;
                });
            }
        }
    };

    // FIX: Enhanced takeover with guaranteed manager initialization
    const takeOverStory = async (itemId, previousUserId) => {
        console.log('takeOverStory called for item:', itemId, 'from user:', previousUserId);
        
        // FIX: Ensure manager is initialized before attempting takeover
        const managerReady = await ensureManagerInitialized();
        if (!managerReady) {
            console.error('Cannot takeover: Failed to initialize CollaborationManager');
            return false;
        }

        const manager = collaborationManagerRef.current;
        if (!manager || manager.isDestroyed) {
            console.error('Cannot takeover: CollaborationManager not available');
            return false;
        }
        
        const itemIdStr = itemId.toString();
        takingOverItemRef.current = itemIdStr;

        try {
            console.log('Starting takeover for item:', itemId, 'from user:', previousUserId);
            
            // 1. Send notification to the previous user
            await manager.sendTakeOverNotification(itemId, previousUserId);
            console.log('Takeover notification sent successfully');
            
            // 2. Update our presence to claim the item
            await manager.setEditingItem(itemIdStr);
            console.log('Updated presence to claim item');
            
            // 3. Update local editing sessions immediately
            setEditingSessions(prevSessions => {
                const newSessions = new Map(prevSessions);
                newSessions.set(itemIdStr, {
                    userId: currentUser.uid,
                    userName: currentUser.name,
                    timestamp: Date.now()
                });
                console.log('Updated local editing sessions');
                return newSessions;
            });

            // 4. Wait for journalist to save changes
            console.log('Waiting for journalist to save changes...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 5. Fetch latest rundown data
            console.log('Fetching latest rundown data...');
            if (!appState.activeRundownId) {
                console.error('No active rundown ID');
                return false;
            }

            const rundownRef = doc(db, "rundowns", appState.activeRundownId);
            const freshRundownDoc = await getDoc(rundownRef);
            let currentItem;

            if (freshRundownDoc.exists()) {
                const freshRundownData = freshRundownDoc.data();
                console.log('Got fresh rundown data, updating app state...');
                setAppState(prev => ({
                    ...prev,
                    rundowns: prev.rundowns.map(r => r.id === appState.activeRundownId ? { id: r.id, ...freshRundownData } : r)
                }));
                currentItem = freshRundownData.items.find(item => item.id.toString() === itemIdStr);
            } else {
                console.warn('Fresh rundown document not found, using existing data');
                const rundownData = appState.rundowns.find(r => r.id === appState.activeRundownId);
                currentItem = rundownData?.items?.find(item => item.id.toString() === itemIdStr);
            }

            if (!currentItem) {
                console.error('Item not found after takeover refresh');
                return false;
            }

            // 6. Wait for state propagation
            await new Promise(resolve => setTimeout(resolve, 500));

            // 7. Open tab with force takeover
            console.log('Opening story tab for producer with fresh data:', currentItem.title);
            openStoryTab(itemId, currentItem, true);
            
            // 8. Force update tab ownership
            setTimeout(() => {
                updateStoryTab(itemId, {
                    isOwner: true,
                    takenOver: false,
                    takenOverBy: null,
                    isBeingTakenOver: false
                });
                console.log('Force updated tab ownership after takeover');
            }, 200);
            
            console.log('Takeover completed successfully');
            return true;
            
        } catch (error) {
            console.error('Error during takeover:', error);
            showTakeoverError(error);
            return false;
        } finally {
            setTimeout(() => {
                if (takingOverItemRef.current === itemIdStr) {
                    takingOverItemRef.current = null;
                }
            }, 3000);
        }
    };

    const showTakeoverError = (error) => {
        let errorMessage = 'Takeover failed. Please try again.';
        
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. You may not have access to this item.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Service temporarily unavailable. Please try again.';
        } else if (error.message) {
            errorMessage = `Takeover failed: ${error.message}`;
        }
        
        console.error('Takeover error details:', errorMessage);
    };

    const saveStoryProgress = async (itemId, storyData) => {
        if (!db || !itemId) return;
        try {
            await setDoc(doc(db, "storyDrafts", `${itemId}_${currentUser.uid}`), {
                itemId,
                userId: currentUser.uid,
                storyData: storyData,
                timestamp: new Date().toISOString(),
                autoSaved: true
            });
        } catch (error) {
            console.error('Error saving story progress:', error);
        }
    };

    const getStoryProgress = async (itemId) => {
        if (!db || !itemId) return null;
        try {
            const draftDoc = await getDoc(doc(db, "storyDrafts", `${itemId}_${currentUser.uid}`));
            return draftDoc.exists() ? draftDoc.data().storyData : null;
        } catch (error) {
            console.error('Error getting story progress:', error);
            return null;
        }
    };

    const setEditingItem = async (itemId) => {
        await ensureManagerInitialized();
        const manager = collaborationManagerRef.current;
        if (manager) {
            await manager.setEditingItem(itemId);
        }
    };

    const clearEditingItem = async () => {
        await ensureManagerInitialized();
        const manager = collaborationManagerRef.current;
        if (manager) {
            await manager.setEditingItem(null);
        }
    };

    const safeUpdateRundown = async (rundownId, updateFunction) => {
        await ensureManagerInitialized();
        const manager = collaborationManagerRef.current;
        if (manager && !manager.isDestroyed) {
            return await manager.safeUpdateRundown(rundownId, updateFunction);
        }
    };

    const getUserEditingItem = (itemId) => {
        return editingSessions.get(itemId.toString());
    };

    const isItemBeingEdited = (itemId) => {
        const session = editingSessions.get(itemId.toString());
        return session && session.userId !== currentUser.uid;
    };

    const value = {
        activeUsers,
        editingSessions,
        notifications,
        startEditingStory,
        stopEditingStory,
        takeOverStory,
        saveStoryProgress,
        getStoryProgress,
        setEditingItem,
        clearEditingItem,
        safeUpdateRundown,
        getUserEditingItem,
        isItemBeingEdited,
        markNotificationAsRead,
        clearAllNotifications,
        CollaborationManager: collaborationManagerRef.current
    };

    return (
        <CollaborationContext.Provider value={value}>
            {children}
        </CollaborationContext.Provider>
    );
};

export const useCollaboration = () => {
    const context = useContext(CollaborationContext);
    if (!context) {
        throw new Error('useCollaboration must be used within a CollaborationProvider');
    }
    return context;
};
