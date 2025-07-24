// src/context/AppContext.jsx
// Main app state management
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { setupFirestoreListeners } from '../hooks/useFirestoreData';

const AppContext = createContext();
export const AppProvider = ({ children }) => {
    const { db } = useAuth();
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
        // Live mode state
        isLive: false,
        liveTime: 0,
        currentLiveItemIndex: 0,
        liveRundownId: null,
    });
    // Setup Firestore listeners
    useEffect(() => {
        if (!db) return;

        const unsubscribe = setupFirestoreListeners(db, setAppState);
        return unsubscribe;
    }, [db]);
    return (
        <AppContext.Provider value={{ appState, setAppState }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    return useContext(AppContext);
};
