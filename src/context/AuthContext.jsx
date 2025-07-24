// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
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
    login: null,
    register: null,
    logout: null,
    db: null,
    loading: true,
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        // Load Firebase using script tags instead of dynamic imports
        await loadFirebaseScripts();
        
        // Wait a bit for scripts to fully load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Access Firebase from window object
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
        const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js');
        const { getFirestore, doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');

        console.log('Firebase modules loaded successfully');

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        console.log('Firebase initialized successfully');

        // Set up auth state listener
        onAuthStateChanged(auth, async (user) => {
          console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
          
          if (user) {
            try {
              const userDoc = await getDoc(doc(db, "users", user.uid));
              const userData = userDoc.exists() ? { uid: user.uid, ...userDoc.data() } : null;
              
              setAuthServices(prev => ({ 
                ...prev, 
                currentUser: userData, 
                loading: false 
              }));
            } catch (error) {
              console.error('Error fetching user data:', error);
              setAuthServices(prev => ({ ...prev, currentUser: null, loading: false }));
            }
          } else {
            setAuthServices(prev => ({ ...prev, currentUser: null, loading: false }));
          }
        });

        const login = async (email, password) => {
          try {
            console.log('Attempting login for:', email);
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log('Login successful');
            return result;
          } catch (error) {
            console.error('Login error:', error);
            throw error;
          }
        };
        
        const register = async (email, password, name, role) => {
          try {
            console.log('Attempting registration for:', email);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = {
              name, 
              email, 
              role,
              username: nameToUsername(name),
              groupId: null
            };
            await setDoc(doc(db, "users", userCredential.user.uid), newUser);
            console.log('Registration successful');
            return userCredential;
          } catch (error) {
            console.error('Registration error:', error);
            throw error;
          }
        };
        
        const logout = async () => {
          try {
            await signOut(auth);
            console.log('Logout successful');
          } catch (error) {
            console.error('Logout error:', error);
            throw error;
          }
        };

        setAuthServices(prev => ({
          ...prev,
          login,
          register,
          logout,
          db,
        }));

        console.log('Auth services initialized');

      } catch (error) {
        console.error("Firebase initialization failed:", error);
        setAuthServices(prev => ({ ...prev, loading: false, db: null }));
      }
    };

    initialize();
  }, []);

  return (
    <AuthContext.Provider value={authServices}>
      {authServices.loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading Firebase...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

// Helper function to load Firebase scripts
const loadFirebaseScripts = () => {
  return new Promise((resolve, reject) => {
    // Check if scripts are already loaded
    if (document.querySelector('script[src*="firebase-app"]')) {
      resolve();
      return;
    }

    let scriptsLoaded = 0;
    const totalScripts = 3;

    const onScriptLoad = () => {
      scriptsLoaded++;
      if (scriptsLoaded === totalScripts) {
        resolve();
      }
    };

    const onScriptError = (error) => {
      console.error('Failed to load Firebase script:', error);
      reject(error);
    };

    // Load Firebase scripts
    const scripts = [
      'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js',
      'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js',
      'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'
    ];

    scripts.forEach(src => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = src;
      script.onload = onScriptLoad;
      script.onerror = onScriptError;
      document.head.appendChild(script);
    });
  });
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
