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
        console.log('Opening story tab for item:', itemId, 'with data:', storyData);
        setAppState(prev => {
            const existingTab = prev.editingStoryTabs.find(tab => tab.itemId.toString() === itemId.toString());
            
            const fullStoryData = {
                ...storyData,
                storyId: storyData.storyId || null
            };

            if (existingTab) {
                console.log('Tab already exists, updating with latest data and switching to it');
                return {
                    ...prev,
                    editingStoryTabs: prev.editingStoryTabs.map(tab =>
                        tab.itemId.toString() === itemId.toString()
                            ? { 
                                ...tab, 
                                storyData: fullStoryData,
                                isBeingTakenOver: false
                            }
                            : tab
                    ),
                    activeTab: `storyEdit-${itemId}`
                };
            }
    
            const newTab = {
                itemId: itemId.toString(),
                storyData: fullStoryData,
                tabId: `storyEdit-${itemId}`,
                title: storyData?.title || 'Untitled Story',
                isOwner: true,
                takenOver: false,
                takenOverBy: null,
                isBeingTakenOver: false
            };
    
            console.log('Creating new tab:', newTab);
    
            return {
                ...prev,
                editingStoryTabs: [...prev.editingStoryTabs, newTab],
                activeTab: `storyEdit-${itemId}`
            };
        });
    };
    
    const closeStoryTab = (itemId) => {
        console.log('Closing story tab for item:', itemId);
        setAppState(prev => {
            const updatedTabs = prev.editingStoryTabs.filter(tab => tab.itemId.toString() !== itemId.toString());
            let newActiveTab = prev.activeTab;
    
            if (prev.activeTab === `storyEdit-${itemId}`) {
                if (updatedTabs.length > 0) {
                    newActiveTab = updatedTabs[updatedTabs.length - 1].tabId;
                } else {
                    newActiveTab = 'rundown';
                }
            }
    
            console.log('Updated tabs after close:', updatedTabs.length, 'New active tab:', newActiveTab);
    
            return {
                ...prev,
                editingStoryTabs: updatedTabs,
                activeTab: newActiveTab
            };
        });
    };
    
    const updateStoryTab = (itemId, updates) => {
        console.log('Updating story tab for item:', itemId, 'with updates:', updates);
        setAppState(prev => ({
            ...prev,
            editingStoryTabs: prev.editingStoryTabs.map(tab =>
                tab.itemId.toString() === itemId.toString() ? { ...tab, ...updates } : tab
            )
        }));
    };

    const forceCloseStoryTab = (itemId) => {
        console.log('Force closing story tab for item:', itemId);
        setAppState(prev => {
            const updatedTabs = prev.editingStoryTabs.filter(tab => tab.itemId.toString() !== itemId.toString());
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
        console.log('setQuickEditItem called with:', item);
        setAppState(prev => {
            console.log('Previous quickEditItem:', prev.quickEditItem);
            const newState = {
                ...prev,
                quickEditItem: item
            };
            console.log('New quickEditItem:', newState.quickEditItem);
            return newState;
        });
    };

    const refreshStoryTabData = (itemId) => {
        setAppState(prev => {
            const rundown = prev.rundowns.find(r => r.id === prev.activeRundownId);
            if (!rundown) return prev;

            const updatedItem = rundown.items.find(item => item.id.toString() === itemId.toString());
            if (!updatedItem) return prev;

            return {
                ...prev,
                editingStoryTabs: prev.editingStoryTabs.map(tab =>
                    tab.itemId.toString() === itemId.toString()
                        ? { ...tab, storyData: updatedItem }
                        : tab
                )
            };
        });
    };

    const contextValue = {
        appState,
        setAppState,
        cleanupDataListeners,
        openStoryTab,
        closeStoryTab,
        updateStoryTab,
        forceCloseStoryTab,
        setQuickEditItem,
        refreshStoryTabData
    };

    console.log('AppContext value:', Object.keys(contextValue));

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
