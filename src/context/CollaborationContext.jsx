/*
================================================================================
File: murrow-nrcs-app.git/src/context/CollaborationContext.jsx
Description: FIX - Removed orderBy from a query to prevent index error and
standardized all Firebase imports to v9.
================================================================================
*/
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
    const collaborationManager = useRef(null);
    const presenceUnsubscribe = useRef(null);
    const notificationsUnsubscribe = useRef(null);

    useEffect(() => {
        if (db && currentUser) {
            collaborationManager.current = new CollaborationManager(db, currentUser);
            setupNotificationListener();
        }

        return () => {
            if (collaborationManager.current) {
                collaborationManager.current.stopPresenceTracking();
            }
            if (presenceUnsubscribe.current) {
                presenceUnsubscribe.current();
            }
            if (notificationsUnsubscribe.current) {
                notificationsUnsubscribe.current();
            }
        };
    }, [db, currentUser]);

    useEffect(() => {
        if (collaborationManager.current && appState.activeRundownId) {
            collaborationManager.current.startPresenceTracking(appState.activeRundownId);

            const setupListener = async () => {
                const unsubscribe = await collaborationManager.current.listenToPresence(
                    appState.activeRundownId,
                    (users) => {
                        setActiveUsers(users);
                        updateEditingSessions(users);
                    }
                );
                presenceUnsubscribe.current = unsubscribe;
            };

            setupListener();

            return () => {
                if (presenceUnsubscribe.current) {
                    presenceUnsubscribe.current();
                }
            };
        }
    }, [appState.activeRundownId]);

    const setupNotificationListener = async () => {
        if (!db || !currentUser) return;

        try {
            // FIX: Removed orderBy("timestamp") to prevent query failure without a composite index.
            const notificationsQuery = query(
                collection(db, "notifications"),
                where("userId", "==", currentUser.uid),
                where("read", "==", false)
            );

            notificationsUnsubscribe.current = onSnapshot(notificationsQuery, (snapshot) => {
                const newNotifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // FIX: Sorting is now done on the client-side to preserve order.
                newNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                setNotifications(newNotifications);

                newNotifications.forEach(notification => {
                    if (notification.type === 'takeOver') {
                        handleTakeOverNotification(notification);
                    }
                });
            });
        } catch (error) {
            console.error('Error setting up notification listener:', error);
        }
    };

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
            await collaborationManager.current?.setEditingItem(itemId);
            
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
        await collaborationManager.current?.setEditingItem(null);
        
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
        if (!collaborationManager.current) return false;
        try {
            await collaborationManager.current.sendTakeOverNotification(itemId, previousUserId);
            await collaborationManager.current.setEditingItem(itemId);
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
        if (collaborationManager.current) {
            await collaborationManager.current.setEditingItem(itemId);
        }
    };

    const clearEditingItem = async () => {
        if (collaborationManager.current) {
            await collaborationManager.current.setEditingItem(null);
        }
    };

    const safeUpdateRundown = async (rundownId, updateFunction) => {
        if (collaborationManager.current) {
            return await collaborationManager.current.safeUpdateRundown(rundownId, updateFunction);
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
        CollaborationManager: CollaborationManager
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
