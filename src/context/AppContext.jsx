/*
================================================================================
File: src/context/AppContext.jsx (MODIFIED)
Description: This file is updated to persist the active tab and rundown
             across page refreshes using localStorage.
================================================================================
*/
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { setupFirestoreListeners } from '../hooks/useFirestoreData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const { db, currentUser } = useAuth();

    // Helper function to initialize state from localStorage
    const getInitialState = () => {
        const savedTab = localStorage.getItem('murrow_active_tab');
        const savedRundownId = localStorage.getItem('murrow_active_rundown_id');

        // We don't restore story edit tabs on refresh because their
        // collaborative state is volatile. Default to a safe tab.
        const initialTab = (savedTab && !savedTab.startsWith('storyEdit-')) ? savedTab : 'stories';

        return {
            users: [],
            groups: [],
            stories: [],
            assignments: [],
            rundowns: [],
            rundownTemplates: [],
            messages: [],
            activeRundownId: savedRundownId || null,
            notifications: [],
            activeTab: initialTab,
            modal: null,
            theme: 'light',
            searchTerm: '',
            showArchived: false,
            createdFolders: [],
            isLive: false,
            liveTime: 0,
            currentLiveItemIndex: 0,
            liveRundownId: null,
            editingStoryTabs: [], // Always start with a clean slate for editing tabs
            quickEditItem: null,
            recentlyClosed: new Set(),
        };
    };

    const [appState, setAppState] = useState(getInitialState);
    const unsubscribeRef = useRef(null);

    // EFFECT: Persist active tab to localStorage
    useEffect(() => {
        // Persist the active tab, but not story edit tabs as they are transient.
        if (appState.activeTab && !appState.activeTab.startsWith('storyEdit-')) {
            localStorage.setItem('murrow_active_tab', appState.activeTab);
        }
    }, [appState.activeTab]);

    // EFFECT: Persist active rundown ID to localStorage
    useEffect(() => {
        if (appState.activeRundownId) {
            localStorage.setItem('murrow_active_rundown_id', appState.activeRundownId);
        } else {
            localStorage.removeItem('murrow_active_rundown_id');
        }
    }, [appState.activeRundownId]);


    useEffect(() => {
        const initializeListeners = async () => {
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
            // Reset state on logout
            setAppState(getInitialState());
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
                    updatedTabs = [...prev.editingStoryTabs];
                    updatedTabs[existingTabIndex] = {
                        ...newTab,
                        isOwner: true,
                        takenOver: false,
                        takenOverBy: null,
                        isBeingTakenOver: false
                    };
                } else {
                    updatedTabs = prev.editingStoryTabs.map((tab, index) =>
                        index === existingTabIndex
                            ? { 
                                ...tab, 
                                storyData: fullStoryData,
                                title: storyData?.title || tab.title
                            }
                            : tab
                    );
                }
            } else {
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
        setAppState(prev => ({
            ...prev,
            editingStoryTabs: prev.editingStoryTabs.map(tab => {
                if (tab.itemId.toString() === itemId.toString()) {
                    return { ...tab, ...updates };
                }
                return tab;
            })
        }));
    }, []);

    const forceCloseStoryTab = useCallback((itemId, isForTakeover = false) => {
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

            return {
                ...prev,
                editingStoryTabs: prev.editingStoryTabs.map(tab =>
                    tab.itemId.toString() === itemId.toString()
                        ? { ...tab, storyData: updatedItem }
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
