/*
================================================================================
File: murrow-nrcs-app.git/src/context/AppContext.jsx
================================================================================
*/
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
        editingStoryId: null,
        editingStoryData: null,
        editingStoryTakenOver: false,
        editingStoryTakenOverBy: null,
        editingStoryIsOwner: false
    });
    const unsubscribeRef = useRef(null); // Use a ref to hold the unsubscribe function

    useEffect(() => {
        const initializeListeners = async () => {
            // If there are existing listeners from a previous session, unsubscribe first.
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }

            if (db && currentUser) {
                // Store the new unsubscribe function in the ref
                unsubscribeRef.current = await setupFirestoreListeners(db, setAppState);
            }
        };

        initializeListeners();

        // This cleanup runs when the component unmounts or dependencies change.
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [db, currentUser]);

    // This function can be called explicitly to clean up listeners, e.g., on logout.
    const cleanupDataListeners = () => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }
    };

    return (
        <AppContext.Provider value={{ appState, setAppState, cleanupDataListeners }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    return useContext(AppContext);
};
