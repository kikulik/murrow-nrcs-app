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
        quickEditItem: null,
        // Add a set to track recently closed tabs to prevent re-opening loops
        recentlyClosed: new Set(),
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
                quickEditItem: null,
                recentlyClosed: new Set(),
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
            // BLOCKER: Prevent re-opening a tab that was just force-closed.
            if (prev.recentlyClosed.has(itemId.toString())) {
                console.warn(`Blocked re-opening of recently closed tab: ${itemId}`);
                return prev;
            }

            const existingTab = prev.editingStoryTabs.find(tab => tab.itemId.toString() === itemId.toString());
            
            const fullStoryData = {
                ...storyData,
                storyId: storyData.storyId || null
            };

            if (existingTab) {
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
    
            return {
                ...prev,
                editingStoryTabs: [...prev.editingStoryTabs, newTab],
                activeTab: `storyEdit-${itemId}`
            };
        });
    };
    
    // Add an 'isForced' flag to handle the takeover scenario
    const closeStoryTab = (itemId, isForced = false) => {
        const itemIdStr = itemId.toString();
        setAppState(prev => {
            const updatedTabs = prev.editingStoryTabs.filter(tab => tab.itemId.toString() !== itemIdStr);
            let newActiveTab = prev.activeTab;
    
            if (prev.activeTab === `storyEdit-${itemIdStr}`) {
                newActiveTab = updatedTabs.length > 0 ? updatedTabs[updatedTabs.length - 1].tabId : 'rundown';
            }
    
            const newRecentlyClosed = new Set(prev.recentlyClosed);
            if (isForced) {
                newRecentlyClosed.add(itemIdStr);
            }

            return {
                ...prev,
                editingStoryTabs: updatedTabs,
                activeTab: newActiveTab,
                recentlyClosed: newRecentlyClosed,
            };
        });

        // If forced, set a timeout to remove the block after 5 seconds
        if (isForced) {
            setTimeout(() => {
                setAppState(prev => {
                    const newRecentlyClosed = new Set(prev.recentlyClosed);
                    newRecentlyClosed.delete(itemIdStr);
                    return { ...prev, recentlyClosed: newRecentlyClosed };
                });
            }, 5000);
        }
    };
    
    const updateStoryTab = (itemId, updates) => {
        setAppState(prev => ({
            ...prev,
            editingStoryTabs: prev.editingStoryTabs.map(tab =>
                tab.itemId.toString() === itemId.toString() ? { ...tab, ...updates } : tab
            )
        }));
    };

    const forceCloseStoryTab = (itemId) => {
        // This is a convenience function that ensures the 'isForced' flag is set.
        closeStoryTab(itemId, true);
    };

    const setQuickEditItem = (item) => {
        setAppState(prev => ({ ...prev, quickEditItem: item }));
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
