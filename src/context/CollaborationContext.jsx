// src/context/CollaborationContext.jsx

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
            const { collection, query, where, onSnapshot, orderBy } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            const notificationsQuery = query(
                collection(db, "notifications"),
                where("userId", "==", currentUser.uid),
                where("read", "==", false),
                orderBy("timestamp", "desc")
            );

            notificationsUnsubscribe.current = onSnapshot(notificationsQuery, (snapshot) => {
                const newNotifications = [];
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    newNotifications.push({
                        id: doc.id,
                        ...data
                    });
                });
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
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
            await updateDoc(doc(db, "notifications", notificationId), { read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const startEditingStory = async (itemId, storyData) => {
        // Check if someone else is editing
        const existingEditor = editingSessions.get(itemId);
        
        if (existingEditor && existingEditor.userId !== currentUser.uid) {
            // Someone else is editing - show as taken over
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
            // We can edit - become the owner
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
            // Send notification to previous user
            await collaborationManager.current.sendTakeOverNotification(itemId, previousUserId);
            
            // Take over editing
            await collaborationManager.current.setEditingItem(itemId);
            
            // Update our state
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
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
            
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
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
            
            const draftDoc = await getDoc(doc(db, "storyDrafts", `${itemId}_${currentUser.uid}`));
            
            if (draftDoc.exists()) {
                return draftDoc.data().storyData;
            }
            return null;
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
        CollaborationManager
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
