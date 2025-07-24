/*
================================================================================
File: murrow-nrcs-app.git/src/context/CollaborationContext.jsx
================================================================================
*/
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useAppContext } from './AppContext';
import { CollaborationManager } from '../services/CollaborationManager';

const CollaborationContext = createContext();

export const CollaborationProvider = ({ children }) => {
    const { currentUser, db } = useAuth();
    const { appState, setAppState } = useAppContext();
    const [activeUsers, setActiveUsers] = useState([]);
    const [editingSessions, setEditingSessions] = useState(new Map());
    const [notifications, setNotifications] = useState([]);
    const collaborationManagerRef = useRef(null);
    const presenceUnsubscribeRef = useRef(null);
    const notificationsUnsubscribeRef = useRef(null);

    useEffect(() => {
        if (db && currentUser) {
            if (!collaborationManagerRef.current) {
                collaborationManagerRef.current = new CollaborationManager(db, currentUser);
            }
        }
    }, [db, currentUser]);

    const setupNotificationListener = useCallback(async () => {
        if (!db || !currentUser || notificationsUnsubscribeRef.current) return;

        try {
            // FIX: Simplified the query to use only one 'where' clause to avoid
            // the need for a composite index. Filtering for 'read === false'
            // will now happen on the client side.
            const notificationsQuery = query(
                collection(db, "notifications"),
                where("userId", "==", currentUser.uid)
            );

            notificationsUnsubscribeRef.current = onSnapshot(notificationsQuery, (snapshot) => {
                const allUserNotifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Filter for unread notifications on the client
                const unreadNotifications = allUserNotifications.filter(n => n.read === false);
                
                unreadNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                setNotifications(unreadNotifications);

                unreadNotifications.forEach(notification => {
                    if (notification.type === 'takeOver') {
                        handleTakeOverNotification(notification);
                    }
                });
            });
        } catch (error) {
            console.error('Error setting up notification listener:', error);
        }
    }, [db, currentUser]);

    useEffect(() => {
        setupNotificationListener();
        return () => {
            if (notificationsUnsubscribeRef.current) {
                notificationsUnsubscribeRef.current();
                notificationsUnsubscribeRef.current = null;
            }
        };
    }, [setupNotificationListener]);
    
    useEffect(() => {
        const manager = collaborationManagerRef.current;
        if (manager && appState.activeRundownId) {
            manager.startPresenceTracking(appState.activeRundownId);

            const setupListener = async () => {
                const unsubscribe = await manager.listenToPresence(
                    appState.activeRundownId,
                    (users) => {
                        setActiveUsers(users);
                        updateEditingSessions(users);
                    }
                );
                presenceUnsubscribeRef.current = unsubscribe;
            };

            setupListener();
        }

        return () => {
            if (presenceUnsubscribeRef.current) {
                presenceUnsubscribeRef.current();
                presenceUnsubscribeRef.current = null;
            }
            // Ensure manager exists before trying to call stopPresenceTracking
            if (collaborationManagerRef.current) {
                collaborationManagerRef.current.stopPresenceTracking();
            }
        };
    }, [appState.activeRundownId, db, currentUser]);


    const updateEditingSessions = (users) => {
        const sessions = new Map();
        users.forEach(user => {
            if (user.editingItem) {
                sessions.set(user.editingItem, {
                    userId: user.userId,
                    userName: user.userName,
                    timestamp: Date.now()
                });
            }
        });
        setEditingSessions(sessions);
    };

    const handleTakeOverNotification = (notification) => {
        if (notification.type === 'takeOver' && appState.editingStoryId === notification.itemId) {
            setAppState(prev => ({
                ...prev,
                editingStoryTakenOver: true,
                editingStoryTakenOverBy: notification.message.match(/(.+) has taken over/)?.[1] || 'another user',
                editingStoryIsOwner: false
            }));

            setTimeout(() => {
                markNotificationAsRead(notification.id);
            }, 3000);
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
        if (!manager) return;

        const existingEditor = editingSessions.get(itemId);
        
        if (existingEditor && existingEditor.userId !== currentUser.uid) {
            setAppState(prev => ({
                ...prev,
                activeTab: 'storyEdit',
                editingStoryId: itemId,
                editingStoryData: storyData,
                editingStoryTakenOver: true,
                editingStoryTakenOverBy: existingEditor.userName,
                editingStoryIsOwner: false
            }));
        } else {
            await manager.setEditingItem(itemId);
            
            setAppState(prev => ({
                ...prev,
                activeTab: 'storyEdit',
                editingStoryId: itemId,
                editingStoryData: storyData,
                editingStoryTakenOver: false,
                editingStoryTakenOverBy: null,
                editingStoryIsOwner: true
            }));
        }
        return true;
    };

    const stopEditingStory = async () => {
        const manager = collaborationManagerRef.current;
        if (manager) {
            await manager.setEditingItem(null);
        }
        
        setAppState(prev => ({
            ...prev,
            editingStoryId: null,
            editingStoryData: null,
            editingStoryTakenOver: false,
            editingStoryTakenOverBy: null,
            editingStoryIsOwner: false
        }));
    };

    const takeOverStory = async (itemId, previousUserId) => {
        const manager = collaborationManagerRef.current;
        if (!manager) return false;

        try {
            await manager.sendTakeOverNotification(itemId, previousUserId);
            await manager.setEditingItem(itemId);
            setAppState(prev => ({
                ...prev,
                editingStoryTakenOver: false,
                editingStoryTakenOverBy: null,
                editingStoryIsOwner: true
            }));
            return true;
        } catch (error) {
            console.error('Error taking over story:', error);
            return false;
        }
    };

    const saveStoryProgress = async (itemId, storyData) => {
        if (!db || !itemId || !appState.editingStoryIsOwner) return;
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
        if (manager) {
            await manager.setEditingItem(itemId);
        }
    };

    const clearEditingItem = async () => {
        const manager = collaborationManagerRef.current;
        if (manager) {
            await manager.setEditingItem(null);
        }
    };

    const safeUpdateRundown = async (rundownId, updateFunction) => {
        const manager = collaborationManagerRef.current;
        if (manager) {
            return await manager.safeUpdateRundown(rundownId, updateFunction);
        }
    };

    const getUserEditingItem = (itemId) => {
        return editingSessions.get(itemId);
    };

    const isItemBeingEdited = (itemId) => {
        const session = editingSessions.get(itemId);
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
        CollaborationManager: collaborationManagerRef.current ? CollaborationManager : null
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
