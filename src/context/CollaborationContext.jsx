// src/context/CollaborationContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useAppContext } from './AppContext';
import { CollaborationManager } from '../services/CollaborationManager';

const CollaborationContext = createContext();

export const CollaborationProvider = ({ children }) => {
    const { currentUser, db } = useAuth();
    const { appState } = useAppContext();
    const [activeUsers, setActiveUsers] = useState([]);
    const collaborationManager = useRef(null);
    const presenceUnsubscribe = useRef(null);

    useEffect(() => {
        if (db && currentUser) {
            collaborationManager.current = new CollaborationManager(db, currentUser);
        }

        return () => {
            if (collaborationManager.current) {
                collaborationManager.current.stopPresenceTracking();
            }
            if (presenceUnsubscribe.current) {
                presenceUnsubscribe.current();
            }
        };
    }, [db, currentUser]);

    useEffect(() => {
        if (collaborationManager.current && appState.activeRundownId) {
            // Start presence tracking for current rundown
            collaborationManager.current.startPresenceTracking(appState.activeRundownId);

            // Listen to other users' presence
            const setupListener = async () => {
                const unsubscribe = await collaborationManager.current.listenToPresence(
                    appState.activeRundownId,
                    setActiveUsers
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

    const takeOverItem = async (itemId, previousUserId) => {
        if (collaborationManager.current) {
            return await collaborationManager.current.takeOverItem(itemId, previousUserId);
        }
        return false;
    };

    const safeUpdateRundown = async (rundownId, updateFunction) => {
        if (collaborationManager.current) {
            return await collaborationManager.current.safeUpdateRundown(rundownId, updateFunction);
        }
    };

    const getUserEditingItem = (itemId) => {
        return activeUsers.find(user => user.editingItem === itemId);
    };

    const isItemBeingEdited = (itemId) => {
        return activeUsers.some(user => user.editingItem === itemId);
    };

    const value = {
        activeUsers,
        setEditingItem,
        clearEditingItem,
        takeOverItem,
        safeUpdateRundown,
        getUserEditingItem,
        isItemBeingEdited,
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
