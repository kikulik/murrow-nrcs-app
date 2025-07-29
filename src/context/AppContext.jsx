// src/context/AppContext.jsx (Fixed)
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

    // FIX: Wrapped functions with useCallback to prevent re-creation on every render,
    // which was causing an infinite loop in the CollaborationContext.
    const openStoryTab = useCallback((itemId, storyData) => {
        setAppState(prev => {
            const itemIdStr = itemId.toString();
            
            const newRecentlyClosed = new Set(prev.recentlyClosed);
            newRecentlyClosed.delete(itemIdStr);
            
            const existingTab = prev.editingStoryTabs.find(tab => tab.itemId.toString() === itemIdStr);
            
            const fullStoryData = {
                ...storyData,
                storyId: storyData.storyId || null
            };

            if (existingTab) {
                return {
                    ...prev,
                    editingStoryTabs: prev.editingStoryTabs.map(tab =>
                        tab.itemId.toString() === itemIdStr
                            ? { 
                                ...tab, 
                                storyData: fullStoryData,
                                isBeingTakenOver: false
                                isOwner: true
                            }
                            : tab
                    ),
                    activeTab: `storyEdit-${itemId}`,
                    recentlyClosed: newRecentlyClosed
                };
            }
    
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
    
            return {
                ...prev,
                editingStoryTabs: [...prev.editingStoryTabs, newTab],
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
            editingStoryTabs: prev.editingStoryTabs.map(tab =>
                tab.itemId.toString() === itemId.toString() ? { ...tab, ...updates } : tab
            )
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
