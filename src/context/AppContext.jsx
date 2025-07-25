// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { setupFirestoreListeners } from '../hooks/useFirestoreData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const { db, currentUser } = useAuth();
    const [appState, setAppState] = useState({
        users: [],
        groups: [],
        stories: [],
        assignments: [],
        rundowns: [],
        rundownTemplates: [],
        messages: [],
        activeRundownId: null,
        notifications: [],
        activeTab: 'stories',
        modal: null,
        theme: 'light',
        searchTerm: '',
        showArchived: false,
        createdFolders: [],
        isLive: false,
        liveTime: 0,
        currentLiveItemIndex: 0,
        liveRundownId: null,
        editingStoryTabs: [],
        quickEditItem: null
    });
    const unsubscribeRef = useRef(null);
    const cleanupTimeoutRef = useRef(null);

    useEffect(() => {
        const initializeListeners = async () => {
            if (cleanupTimeoutRef.current) {
                clearTimeout(cleanupTimeoutRef.current);
                cleanupTimeoutRef.current = null;
            }

            if (unsubscribeRef.current) {
                try {
                    unsubscribeRef.current();
                } catch (error) {
                    console.warn('Error cleaning up previous listeners:', error);
                }
                unsubscribeRef.current = null;
            }

            if (db && currentUser) {
                try {
                    unsubscribeRef.current = await setupFirestoreListeners(db, setAppState);
                } catch (error) {
                    console.error('Error setting up Firestore listeners:', error);
                }
            }
        };

        initializeListeners();

        return () => {
            if (unsubscribeRef.current) {
                try {
                    unsubscribeRef.current();
                } catch (error) {
                    console.warn('Error during cleanup:', error);
                }
                unsubscribeRef.current = null;
            }
        };
    }, [db, currentUser]);

    useEffect(() => {
        if (!currentUser && unsubscribeRef.current) {
            cleanupDataListeners();

            setAppState({
                users: [],
                groups: [],
                stories: [],
                assignments: [],
                rundowns: [],
                rundownTemplates: [],
                messages: [],
                activeRundownId: null,
                notifications: [],
                activeTab: 'stories',
                modal: null,
                theme: 'light',
                searchTerm: '',
                showArchived: false,
                createdFolders: [],
                isLive: false,
                liveTime: 0,
                currentLiveItemIndex: 0,
                liveRundownId: null,
                editingStoryTabs: [],
                quickEditItem: null
            });
        }
    }, [currentUser]);

    const cleanupDataListeners = () => {
        if (unsubscribeRef.current) {
            try {
                unsubscribeRef.current();
            } catch (error) {
                console.warn('Error during explicit cleanup:', error);
            }
            unsubscribeRef.current = null;
        }
    };

    const openStoryTab = (itemId, storyData) => {
        setAppState(prev => {
            const existingTab = prev.editingStoryTabs.find(tab => tab.itemId === itemId);
            if (existingTab) {
                return {
                    ...prev,
                    activeTab: `storyEdit-${itemId}`
                };
            }

            const newTab = {
                itemId,
                storyData,
                tabId: `storyEdit-${itemId}`,
                title: storyData.title || 'Untitled Story',
                isOwner: true,
                takenOver: false,
                takenOverBy: null
            };

            return {
                ...prev,
                editingStoryTabs: [...prev.editingStoryTabs, newTab],
                activeTab: `storyEdit-${itemId}`
            };
        });
    };

    const closeStoryTab = (itemId) => {
        setAppState(prev => {
            const updatedTabs = prev.editingStoryTabs.filter(tab => tab.itemId !== itemId);
            let newActiveTab = prev.activeTab;

            if (prev.activeTab === `storyEdit-${itemId}`) {
                if (updatedTabs.length > 0) {
                    newActiveTab = updatedTabs[updatedTabs.length - 1].tabId;
                } else {
                    newActiveTab = 'rundown';
                }
            }

            return {
                ...prev,
                editingStoryTabs: updatedTabs,
                activeTab: newActiveTab
            };
        });
    };

    const updateStoryTab = (itemId, updates) => {
        setAppState(prev => ({
            ...prev,
            editingStoryTabs: prev.editingStoryTabs.map(tab =>
                tab.itemId === itemId ? { ...tab, ...updates } : tab
            )
        }));
    };

    const forceCloseStoryTab = (itemId) => {
        setAppState(prev => {
            const updatedTabs = prev.editingStoryTabs.filter(tab => tab.itemId !== itemId);
            let newActiveTab = prev.activeTab;

            if (prev.activeTab === `storyEdit-${itemId}`) {
                if (updatedTabs.length > 0) {
                    newActiveTab = updatedTabs[updatedTabs.length - 1].tabId;
                } else {
                    newActiveTab = 'rundown';
                }
            }

            return {
                ...prev,
                editingStoryTabs: updatedTabs,
                activeTab: newActiveTab
            };
        });
    };

    const setQuickEditItem = (item) => {
        setAppState(prev => ({
            ...prev,
            quickEditItem: item
        }));
    };

    return (
        <AppContext.Provider value={{
            appState,
            setAppState,
            cleanupDataListeners,
            openStoryTab,
            closeStoryTab,
            updateStoryTab,
            forceCloseStoryTab,
            setQuickEditItem
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    return useContext(AppContext);
};
