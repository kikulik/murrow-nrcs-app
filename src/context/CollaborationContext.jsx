/*
================================================================================
File: src/context/CollaborationContext.jsx (NEWLY ADDED & MODIFIED)
Description: This file is added to the Canvas and modified to fix a race
             condition during story takeovers. It now passes the name of the
             user initiating the takeover directly in the notification update.
================================================================================
*/
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
// The AppContext import is now relative to its new position in the combined file
// import { useAppContext } from './AppContext'; 
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

    useEffect(() => {
        if (db && currentUser) {
            if (!collaborationManagerRef.current || collaborationManagerRef.current.isDestroyed) {
                console.log('Creating new CollaborationManager');
                collaborationManagerRef.current = new CollaborationManager(db, currentUser);
                presenceInitialized.current = false;
            }
        } else {
            if (collaborationManagerRef.current && !collaborationManagerRef.current.isDestroyed) {
                collaborationManagerRef.current.stopPresenceTracking();
            }
            collaborationManagerRef.current = null;
            presenceInitialized.current = false;
        }
    }, [db, currentUser]);

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
        console.log('Processing takeover notification for item:', notification.itemId, 'by:', notification.takenOverByName);
        
        // FIX: Pass the name of the user who took over directly into the tab state.
        // This is faster and more reliable than waiting for the presence update.
        updateStoryTab(notification.itemId, { 
            isBeingTakenOver: true,
            takenOverBy: notification.takenOverByName // Add this field
        });
        await markNotificationAsRead(notification.id);
    }, [updateStoryTab, markNotificationAsRead]);

    const setupNotificationListener = useCallback(async () => {
        if (!db || !currentUser) return;
        
        if (notificationsUnsubscribeRef.current) {
            try {
                notificationsUnsubscribeRef.current();
            } catch (error) {
                console.warn('Error cleaning up previous notification listener:', error);
            }
            notificationsUnsubscribeRef.current = null;
        }

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
                        
                        const unprocessedNotifications = unreadNotifications.filter(n => 
                            !processedNotifications.current.has(n.id)
                        );
                        
                        unprocessedNotifications.forEach(notification => {
                            handleTakeOverNotification(notification);
                        });
                    } catch (error) {
                        console.error('Error processing notifications:', error);
                    }
                },
                (error) => {
                    console.error('Notifications listener error:', error);
                    if (error.code === 'permission-denied') {
                        console.warn('Permission denied for notifications, user may need to re-login');
                    }
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
        const manager = collaborationManagerRef.current;
        
        try {
            if (manager && !manager.isDestroyed && appState.activeRundownId && currentUser) {
                if (!presenceInitialized.current) {
                    presenceInitialized.current = true;
                    manager.startPresenceTracking(appState.activeRundownId);
                    manager.listenToPresence(
                        appState.activeRundownId,
                        (allUsers) => {
                            setActiveUsers(allUsers);
                            updateEditingSessions(allUsers);
                        }
                    );
                }
            } else if (!appState.activeRundownId) {
                presenceInitialized.current = false;
            }
        } catch (error) {
            console.error('Error in presence tracking setup:', error);
        }

        return () => {
            try {
                if (manager && !manager.isDestroyed && presenceInitialized.current) {
                    if (!manager.isActivelyEditing) {
                        manager.stopPresenceTracking();
                        presenceInitialized.current = false;
                    }
                }
            } catch (error) {
                console.error('Error cleaning up presence tracking:', error);
            }
        };
    }, [appState.activeRundownId, currentUser, updateEditingSessions]);

    const startEditingStory = async (itemId, storyData) => {
        try {
            if (!itemId || !storyData || !currentUser) {
                return false;
            }

            if (!collaborationManagerRef.current || collaborationManagerRef.current.isDestroyed) {
                collaborationManagerRef.current = new CollaborationManager(db, currentUser);
                if (appState.activeRundownId) {
                    collaborationManagerRef.current.startPresenceTracking(appState.activeRundownId);
                    collaborationManagerRef.current.listenToPresence(
                        appState.activeRundownId,
                        (allUsers) => {
                            setActiveUsers(allUsers);
                            updateEditingSessions(allUsers);
                        }
                    );
                }
            }

            const manager = collaborationManagerRef.current;
            if (!manager) {
                return false;
            }
        
            const editingUser = editingSessions.get(itemId.toString());
            const isBeingEditedByOther = editingUser && editingUser.userId !== currentUser.uid;

            if (isBeingEditedByOther) {
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

    const takeOverStory = async (itemId, previousUserId) => {
        const manager = collaborationManagerRef.current;
        if (!manager || manager.isDestroyed) return false;
        
        const itemIdStr = itemId.toString();
        takingOverItemRef.current = itemIdStr;

        try {
            await manager.sendTakeOverNotification(itemId, previousUserId);
            await manager.clearPreviousUserEditingState(previousUserId, itemIdStr);
            await manager.setEditingItem(itemIdStr);

            setEditingSessions(prevSessions => {
                const newSessions = new Map(prevSessions);
                newSessions.set(itemIdStr, {
                    userId: currentUser.uid,
                    userName: currentUser.name,
                    timestamp: Date.now()
                });
                return newSessions;
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            const rundownRef = doc(db, "rundowns", appState.activeRundownId);
            const freshRundownDoc = await getDoc(rundownRef);
            let currentItem;

            if (freshRundownDoc.exists()) {
                const freshRundownData = freshRundownDoc.data();
                setAppState(prev => ({
                    ...prev,
                    rundowns: prev.rundowns.map(r => r.id === appState.activeRundownId ? { id: r.id, ...freshRundownData } : r)
                }));
                currentItem = freshRundownData.items.find(item => item.id.toString() === itemIdStr);
            } else {
                const rundownData = appState.rundowns.find(r => r.id === appState.activeRundownId);
                currentItem = rundownData?.items?.find(item => item.id.toString() === itemIdStr);
            }

            if (!currentItem) {
                return false;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            openStoryTab(itemId, currentItem, true);
            
            setTimeout(() => {
                updateStoryTab(itemId, {
                    isOwner: true,
                    takenOver: false,
                    takenOverBy: null,
                    isBeingTakenOver: false
                });
            }, 200);
            
            return true;
        } catch (error) {
            console.error('Error taking over story:', error);
            return false;
        } finally {
            setTimeout(() => {
                if (takingOverItemRef.current === itemIdStr) {
                    takingOverItemRef.current = null;
                }
            }, 3000);
        }
    };

    const setEditingItem = async (itemId) => {
        if (!collaborationManagerRef.current || collaborationManagerRef.current.isDestroyed) {
            collaborationManagerRef.current = new CollaborationManager(db, currentUser);
        }
        const manager = collaborationManagerRef.current;
        if (manager) {
            await manager.setEditingItem(itemId);
        }
    };

    const clearEditingItem = async () => {
        if (!collaborationManagerRef.current || collaborationManagerRef.current.isDestroyed) {
            collaborationManagerRef.current = new CollaborationManager(db, currentUser);
        }
        const manager = collaborationManagerRef.current;
        if (manager) {
            await manager.setEditingItem(null);
        }
    };

    const safeUpdateRundown = async (rundownId, updateFunction) => {
        const manager = collaborationManagerRef.current;
        if (manager && !manager.isDestroyed) {
            return await manager.safeUpdateRundown(rundownId, updateFunction);
        }
    };

    const getUserEditingItem = (itemId) => {
        return editingSessions.get(itemId.toString());
    };

    const value = {
        activeUsers,
        editingSessions,
        notifications,
        startEditingStory,
        stopEditingStory,
        takeOverStory,
        setEditingItem,
        clearEditingItem,
        safeUpdateRundown,
        getUserEditingItem,
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
