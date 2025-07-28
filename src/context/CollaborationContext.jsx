// src/context/CollaborationContext.jsx (Final Fix)
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

    useEffect(() => {
        if (db && currentUser) {
            if (!collaborationManagerRef.current || collaborationManagerRef.current.isDestroyed) {
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

    const markNotificationAsRead = async (notificationId) => {
        if (!db || !notificationId) return;
        try {
            await updateDoc(doc(db, "notifications", notificationId), { read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const clearAllNotifications = async () => {
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
    };

    const handleTakeOverNotification = useCallback(async (notification) => {
        if (!notification || notification.type !== 'takeOver' || processedNotifications.current.has(notification.id)) {
            return;
        }

        processedNotifications.current.add(notification.id);
        updateStoryTab(notification.itemId, { isBeingTakenOver: true });
        await markNotificationAsRead(notification.id);
    }, [updateStoryTab, markNotificationAsRead]);

    const setupNotificationListener = useCallback(async () => {
        if (!db || !currentUser || notificationsUnsubscribeRef.current) return;

        try {
            const notificationsQuery = query(
                collection(db, "notifications"),
                where("userId", "==", currentUser.uid)
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
                        
                        newNotifications.forEach(handleTakeOverNotification);
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
        const sessions = new Map();
        users.forEach(user => {
            if (user.editingItem) {
                sessions.set(user.editingItem.toString(), {
                    userId: user.userId,
                    userName: user.userName,
                    timestamp: Date.now()
                });
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
    }, []);

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
                    manager.stopPresenceTracking();
                    presenceInitialized.current = false;
                }
            } catch (error) {
                console.error('Error cleaning up presence tracking:', error);
            }
        };
    }, [appState.activeRundownId, currentUser, updateEditingSessions]);

    const startEditingStory = async (itemId, storyData) => {
        try {
            if (!itemId || !storyData || !currentUser) {
                console.error('Missing required parameters for startEditingStory');
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
                console.error('Failed to create collaboration manager');
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
        
        try {
            console.log('Starting takeover for item:', itemId, 'from user:', previousUserId);
            
            const rundownData = appState.rundowns.find(r => r.id === appState.activeRundownId);
            const currentItem = rundownData?.items?.find(item => item.id.toString() === itemId.toString());
            
            if (!currentItem) {
                console.error('Item not found in rundown');
                return false;
            }

            await manager.clearPreviousUserEditingState(previousUserId, itemId);
            
            // Force close with takeover flag = true
            forceCloseStoryTab(itemId, true);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await manager.setEditingItem(itemId.toString());
            await manager.sendTakeOverNotification(itemId, previousUserId);
            
            setEditingSessions(prevSessions => {
                const newSessions = new Map(prevSessions);
                newSessions.set(itemId.toString(), {
                    userId: currentUser.uid,
                    userName: currentUser.name,
                    timestamp: Date.now()
                });
                return newSessions;
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('Opening story tab for producer after takeover');
            openStoryTab(itemId, currentItem);
            updateStoryTab(itemId, {
                isOwner: true,
                takenOver: false,
                takenOverBy: null
            });
            
            console.log('Takeover completed successfully');
            return true;
        } catch (error) {
            console.error('Error taking over story:', error);
            return false;
        }
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
