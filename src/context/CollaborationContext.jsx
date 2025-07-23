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
    const [conflictItems, setConflictItems] = useState(new Map());
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
            const unsubscribe = collaborationManager.current.listenToPresence(
                appState.activeRundownId,
                setActiveUsers
            );
            presenceUnsubscribe.current = unsubscribe;

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

    const safeUpdateRundown = async (rundownId, updateFunction) => {
        if (collaborationManager.current) {
            return await collaborationManager.current.safeUpdateRundown(rundownId, updateFunction);
        }
    };

    const resolveConflict = (itemId, resolution) => {
        setConflictItems(prev => {
            const newMap = new Map(prev);
            if (resolution === 'dismiss') {
                newMap.delete(itemId);
            } else {
                const conflict = newMap.get(itemId);
                if (conflict) {
                    const resolved = CollaborationManager.resolveConflict(
                        conflict.local,
                        conflict.server,
                        resolution
                    );
                    // Here you would apply the resolved item back to the rundown
                    newMap.delete(itemId);
                }
            }
            return newMap;
        });
    };

    const detectConflicts = (localItems, serverItems) => {
        const conflicts = new Map();

        localItems.forEach(localItem => {
            const serverItem = serverItems.find(si => si.id === localItem.id);
            if (serverItem && CollaborationManager.detectConflict(localItem, serverItem)) {
                conflicts.set(localItem.id, {
                    local: localItem,
                    server: serverItem,
                    timestamp: new Date().toISOString()
                });
            }
        });

        setConflictItems(conflicts);
        return conflicts;
    };

    const getUserEditingItem = (itemId) => {
        return activeUsers.find(user => user.editingItem === itemId);
    };

    const isItemBeingEdited = (itemId) => {
        return activeUsers.some(user => user.editingItem === itemId);
    };

    const value = {
        activeUsers,
        conflictItems,
        setEditingItem,
        clearEditingItem,
        safeUpdateRundown,
        resolveConflict,
        detectConflicts,
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