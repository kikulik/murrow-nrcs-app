// src/context/AuthContext.jsx
// Contains AuthProvider and useAuth
import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeFirebase } from '../lib/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authServices, setAuthServices] = useState({
        currentUser: null,
        login: null,
        register: null,
        logout: null,
        db: null,
        loading: true,
    });

    useEffect(() => {
        const initialize = async () => {
            try {
                const services = await initializeFirebase();
                setAuthServices(prev => ({ ...prev, ...services }));
            } catch (error) {
                console.error("Firebase initialization failed", error);
                setAuthServices(prev => ({ ...prev, loading: false, db: null }));
            }
        };

        initialize();
    }, []);

    return (
        <AuthContext.Provider value={authServices}>
            {authServices.loading ?
                <div className="min-h-screen flex items-center justify-center">Loading...</div> :
                children
            }
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};