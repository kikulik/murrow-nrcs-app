import { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { nameToUsername } from '../utils/helpers';

const AuthContext = createContext();

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABPQCCJYON6b1MBJsnCGHFjLjLCK3WBOo",
  authDomain: "murrow-82a95.firebaseapp.com",
  databaseURL: "https://murrow-82a95-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "murrow-82a95",
  storageBucket: "murrow-82a95.firebasestorage.app",
  messagingSenderId: "177504964658",
  appId: "1:177504964658:web:1ed07d9588c1675fabec2b",
  measurementId: "G-DY9MGNYTJC"
};

export const AuthProvider = ({ children }) => {
    const [authServices, setAuthServices] = useState({
        currentUser: null,
        db: null,
        auth: null,
        loading: true,
    });

    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userDocRef);
                    const userData = userDoc.exists() ? { uid: user.uid, ...userDoc.data() } : null;
                    setAuthServices({ currentUser: userData, db, auth, loading: false });
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setAuthServices({ currentUser: null, db, auth, loading: false });
                }
            } else {
                setAuthServices({ currentUser: null, db, auth, loading: false });
            }
        });

        return () => unsubscribe();
    }, []);

    const login = (email, password) => {
        if (!authServices.auth) throw new Error("Auth service not initialized.");
        return signInWithEmailAndPassword(authServices.auth, email, password);
    };

    const register = async (email, password, name, role) => {
        if (!authServices.auth || !authServices.db) throw new Error("Auth or DB service not initialized.");
        const userCredential = await createUserWithEmailAndPassword(authServices.auth, email, password);
        const newUser = {
            name,
            email,
            role,
            username: nameToUsername(name),
            groupId: null
        };
        await setDoc(doc(authServices.db, "users", userCredential.user.uid), newUser);
        return userCredential;
    };

    const logout = () => {
        if (!authServices.auth) throw new Error("Auth service not initialized.");
        return signOut(authServices.auth);
    };

    const value = {
        ...authServices,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {authServices.loading ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-800 dark:text-gray-200">Initializing Application...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
