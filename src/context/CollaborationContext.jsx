// src/context/CollaborationContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useAppContext } from './AppContext';
import { CollaborationManager } from '../services/CollaborationManager';

const CollaborationContext = createContext();

export const CollaborationProvider = ({ children }) => {
    const { currentUser, db } = useAuth();
    const { appState, setAppState, openStoryTab, updateStoryTab, forceCloseStoryTab } = useAppContext();
    const [activeUsers, setActiveUsers] = useState([]);
    const [editingSessions, setEditingSessions] = useState(new Map());
    const [notifications, setNotifications] = useState([]);
    const collaborationManagerRef = useRef(null);
    const notificationsUnsubscribeRef = useRef(null);
    const presenceInitialized = useRef(false);

    useEffect(() => {
        if (db && currentUser) {
            if (!collaborationManagerRef.current || collaborationManagerRef.current.isDestroyed) {
                collaborationManagerRef.current = new CollaborationManager(db, currentUser);
                presenceInitialized.current = false;
            }
        } else {
            if (collaborationManagerRef.current && !collaborationManagerRef.current.isDestroyed) {
                collaborationManagerRef.current.stopPresenceTracking();
                collaborationManagerRef.current = null;
                presenceInitialized.current = false;
            }
        }
    }, [db, currentUser]);

    useEffect(() => {
        if (!currentUser) {
            if (collaborationManagerRef.current && !collaborationManagerRef.current.isDestroyed) {
                collaborationManagerRef.current.stopPresenceTracking();
                collaborationManagerRef.current = null;
            }

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
        }
    }, [currentUser]);

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
                    const allUserNotifications = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    const unreadNotifications = allUserNotifications.filter(n => n.read === false);
                    unreadNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    setNotifications(unreadNotifications);
                    unreadNotifications.forEach(handleTakeOverNotification);
                },
                (error) => {
                    console.error('Notifications listener error:', error);
                }
            );
        } catch (error) {
            console.error('Error setting up notification listener:', error);
        }
    }, [db, currentUser]);

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

    useEffect(() => {
        const manager = collaborationManagerRef.current;
        
        if (manager && !manager.isDestroyed && appState.activeRundownId && currentUser && !presenceInitialized.current) {
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

        return () => {
            if (manager && !manager.isDestroyed) {
                manager.stopPresenceTracking();
                presenceInitialized.current = false;
            }
        };
    }, [appState.activeRundownId, db, currentUser]);

    const updateEditingSessions = (users) => {
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
        setEditingSessions(sessions);
    };

    const handleTakeOverNotification = (notification) => {
        if (notification.type === 'takeOver') {
            const tabToClose = appState.editingStoryTabs.find(tab => tab.itemId === notification.itemId);
            if (tabToClose) {
                setTimeout(() => markNotificationAsRead(notification.id), 3000);
                forceCloseStoryTab(notification.itemId);
            }
        }
    };

    const markNotificationAsRead = async (notificationId) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, "notifications", notificationId), { read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const startEditingStory = async (itemId, storyData) => {
        const manager = collaborationManagerRef.current;
        if (!manager || manager.isDestroyed) {
            console.error('No collaboration manager available');
            return;
        }
    
        const editingUser = editingSessions.get(itemId.toString());
        const isBeingEditedByOther = editingUser && editingUser.userId !== currentUser.uid;

        if (isBeingEditedByOther) {
            openStoryTab(itemId, storyData);
            updateStoryTab(itemId, {
                isOwner: false,
                takenOver: true,
                takenOverBy: editingUser.userName,
            });
        } else {
            await manager.setEditingItem(itemId.toString());
            openStoryTab(itemId, storyData);
            updateStoryTab(itemId, {
                isOwner: true,
                takenOver: false,
                takenOverBy: null,
            });
        }
        return true;
    };

    const stopEditingStory = async (itemId) => {
        const manager = collaborationManagerRef.current;
        if (manager && !manager.isDestroyed) {
            const editingUser = editingSessions.get(itemId?.toString());
            if (editingUser && editingUser.userId === currentUser.uid) {
                 await manager.setEditingItem(null);
            }
        }
    };

    const takeOverStory = async (itemId, previousUserId) => {
        const manager = collaborationManagerRef.current;
        if (!manager || manager.isDestroyed) return false;
        
        try {
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
            
            await manager.setEditingItem(itemId.toString());
            
            updateStoryTab(itemId, {
                isOwner: true,
                takenOver: false,
                takenOverBy: null
            });
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
        const manager = collaborationManagerRef.current;
        if (manager && !manager.isDestroyed) {
            await manager.setEditingItem(itemId);
        }
    };

    const clearEditingItem = async () => {
        const manager = collaborationManagerRef.current;
        if (manager && !manager.isDestroyed) {
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
