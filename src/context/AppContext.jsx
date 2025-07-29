// src/context/AppContext.jsx 
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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

    const openStoryTab = useCallback((itemId, storyData, forceTakeover = false) => {
        setAppState(prev => {
            const itemIdStr = itemId.toString();
            
            const newRecentlyClosed = new Set(prev.recentlyClosed);
            newRecentlyClosed.delete(itemIdStr);
            
            const existingTabIndex = prev.editingStoryTabs.findIndex(tab => tab.itemId.toString() === itemIdStr);
            
            const fullStoryData = {
                ...storyData,
                storyId: storyData.storyId || null
            };

            const newTab = {
                itemId: itemIdStr,
                storyData: fullStoryData,
                tabId: `storyEdit-${itemId}`,
                title: storyData?.title || 'Untitled Story',
                isOwner: true, 
                takenOver: false,
                takenOverBy: null,
                isBeingTakenOver: false
            };

            let updatedTabs;

            if (existingTabIndex !== -1) {
                if (forceTakeover) {
                    console.log('AppContext: Force replacing tab due to takeover for item:', itemIdStr);
                    updatedTabs = [...prev.editingStoryTabs];
                    updatedTabs[existingTabIndex] = newTab;
                } else {
                    console.log('AppContext: Updating existing tab for item:', itemIdStr);
                    updatedTabs = prev.editingStoryTabs.map((tab, index) =>
                        index === existingTabIndex
                            ? { 
                                ...tab, 
                                storyData: fullStoryData,
                                isBeingTakenOver: false,
                                title: storyData?.title || tab.title
                            }
                            : tab
                    );
                }
            } else {
                console.log('AppContext: Creating new tab for item:', itemIdStr);
                updatedTabs = [...prev.editingStoryTabs, newTab];
            }

            return {
                ...prev,
                editingStoryTabs: updatedTabs,
                activeTab: `storyEdit-${itemId}`,
                recentlyClosed: newRecentlyClosed
            };
        });
    }, []);
    
    const closeStoryTab = useCallback((itemId, isForced = false, isForTakeover = false) => {
        const itemIdStr = itemId.toString();
        setAppState(prev => {
            const updatedTabs = prev.editingStoryTabs.filter(tab => tab.itemId.toString() !== itemIdStr);
            let newActiveTab = prev.activeTab;
    
            if (prev.activeTab === `storyEdit-${itemIdStr}`) {
                newActiveTab = updatedTabs.length > 0 ? updatedTabs[updatedTabs.length - 1].tabId : 'rundown';
            }
    
            const newRecentlyClosed = new Set(prev.recentlyClosed);
            
            if (isForced && !isForTakeover) {
                newRecentlyClosed.add(itemIdStr);
            }

            console.log('AppContext: Closing tab for item:', itemIdStr, 'isForced:', isForced, 'isForTakeover:', isForTakeover);

            return {
                ...prev,
                editingStoryTabs: updatedTabs,
                activeTab: newActiveTab,
                recentlyClosed: newRecentlyClosed,
            };
        });

        if (isForced && !isForTakeover) {
            setTimeout(() => {
                setAppState(prev => {
                    const newRecentlyClosed = new Set(prev.recentlyClosed);
                    newRecentlyClosed.delete(itemIdStr);
                    return { ...prev, recentlyClosed: newRecentlyClosed };
                });
            }, 5000);
        }
    }, []);
    
    const updateStoryTab = useCallback((itemId, updates) => {
        console.log('AppContext: updateStoryTab called for item:', itemId, 'with updates:', updates);
        setAppState(prev => ({
            ...prev,
            editingStoryTabs: prev.editingStoryTabs.map(tab => {
                if (tab.itemId.toString() === itemId.toString()) {
                    const updatedTab = { ...tab, ...updates };
                    console.log('AppContext: Updated tab from:', tab, 'to:', updatedTab);
                    return updatedTab;
                } else {
                    return tab;
                }
            })
        }));
    }, []);

    const forceCloseStoryTab = useCallback((itemId, isForTakeover = false) => {
        console.log('AppContext: Force closing tab for item:', itemId, 'isForTakeover:', isForTakeover);
        closeStoryTab(itemId, true, isForTakeover);
    }, [closeStoryTab]);

    const setQuickEditItem = useCallback((item) => {
        setAppState(prev => ({ ...prev, quickEditItem: item }));
    }, []);

    const refreshStoryTabData = useCallback((itemId) => {
        setAppState(prev => {
            const rundown = prev.rundowns.find(r => r.id === prev.activeRundownId);
            if (!rundown) return prev;

            const updatedItem = rundown.items.find(item => item.id.toString() === itemId.toString());
            if (!updatedItem) return prev;

            console.log('AppContext: Refreshing tab data for item:', itemId, 'with:', updatedItem);

            return {
                ...prev,
                editingStoryTabs: prev.editingStoryTabs.map(tab =>
                    tab.itemId.toString() === itemId.toString()
                        ? { 
                            ...tab, 
                            storyData: updatedItem,
                            title: updatedItem.title || tab.title 
                        }
                        : tab
                )
            };
        });
    }, []);

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
