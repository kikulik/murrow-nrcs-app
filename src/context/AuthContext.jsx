// src/context/AuthContext.jsx - Firebase v8 approach
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
        // Load Firebase v8 using script tags
        await loadFirebaseV8();
        
        console.log('Firebase loaded, initializing...');
        
        // Initialize Firebase using the global firebase object
        if (!window.firebase) {
          throw new Error('Firebase not loaded');
        }

        // Initialize Firebase
        const app = window.firebase.initializeApp(firebaseConfig);
        const auth = window.firebase.auth();
        const db = window.firebase.firestore();

        console.log('Firebase initialized successfully');

        // Set up auth state listener
        auth.onAuthStateChanged(async (user) => {
          console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
          
          if (user) {
            try {
              const userDoc = await db.collection("users").doc(user.uid).get();
              const userData = userDoc.exists ? { uid: user.uid, ...userDoc.data() } : null;
              
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
            const result = await auth.signInWithEmailAndPassword(email, password);
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
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const newUser = {
              name, 
              email, 
              role,
              username: nameToUsername(name),
              groupId: null
            };
            await db.collection("users").doc(userCredential.user.uid).set(newUser);
            console.log('Registration successful');
            return userCredential;
          } catch (error) {
            console.error('Registration error:', error);
            throw error;
          }
        };
        
        const logout = async () => {
          try {
            await auth.signOut();
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

// Helper function to load Firebase v8 scripts
const loadFirebaseV8 = () => {
  return new Promise((resolve, reject) => {
    // Check if Firebase is already loaded
    if (window.firebase) {
      resolve();
      return;
    }

    // Check if scripts are already loading
    if (document.querySelector('script[src*="firebase-app"]')) {
      // Wait for existing scripts to load
      const checkFirebase = () => {
        if (window.firebase) {
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
      return;
    }

    let scriptsLoaded = 0;
    const totalScripts = 3;

    const onScriptLoad = () => {
      scriptsLoaded++;
      if (scriptsLoaded === totalScripts) {
        // Wait a bit for Firebase to be fully available
        setTimeout(() => {
          if (window.firebase) {
            resolve();
          } else {
            reject(new Error('Firebase not available after loading'));
          }
        }, 100);
      }
    };

    const onScriptError = (error) => {
      console.error('Failed to load Firebase script:', error);
      reject(error);
    };

    // Load Firebase v8 scripts in order
    const scripts = [
      'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
      'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
      'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js'
    ];

    scripts.forEach((src, index) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = onScriptLoad;
      script.onerror = onScriptError;
      
      // Add scripts to head
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
