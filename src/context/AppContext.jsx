/*
================================================================================
File: murrow-nrcs-app.git/src/context/AppContext.jsx
Description: This file manages the global application state.
FIX: The useEffect hook has been restructured to correctly handle the async
`setupFirestoreListeners` function. An async function is now defined and called
inside the hook, ensuring the cleanup function is returned correctly. This
solves the primary issue of data listeners not being attached.
================================================================================
*/
import React, { createContext, useContext, useState, useEffect } from 'react';
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
        editingStoryId: null,
        editingStoryData: null,
        editingStoryTakenOver: false,
        editingStoryTakenOverBy: null,
        editingStoryIsOwner: false
    });

    useEffect(() => {
        let unsubscribeFromListeners;

        const initializeListeners = async () => {
            if (db && currentUser) {
                // setupFirestoreListeners is async, so we await its result
                unsubscribeFromListeners = await setupFirestoreListeners(db, setAppState);
            }
        };

        initializeListeners();

        // The cleanup function will be called when the component unmounts
        // or when dependencies change.
        return () => {
            if (unsubscribeFromListeners) {
                unsubscribeFromListeners();
            }
        };
    }, [db, currentUser]);

    return (
        <AppContext.Provider value={{ appState, setAppState }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    return useContext(AppContext);
};
