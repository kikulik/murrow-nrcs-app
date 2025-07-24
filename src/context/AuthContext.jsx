// Alternative approach using script tags and global Firebase
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

// Function to load Firebase from CDN using script tags
const loadFirebaseFromCDN = () => {
  return new Promise((resolve, reject) => {
    // Check if Firebase is already loaded
    if (window.firebase) {
      resolve(window.firebase);
      return;
    }

    // Create script elements for Firebase
    const scripts = [
      'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js'
    ];

    let loadedScripts = 0;

    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loadedScripts++;
        if (loadedScripts === scripts.length) {
          // All scripts loaded, initialize Firebase
          if (window.firebase) {
            resolve(window.firebase);
          } else {
            reject(new Error('Firebase not available after loading scripts'));
          }
        }
      };
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  });
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
        // Load Firebase from CDN
        const firebase = await loadFirebaseFromCDN();
        
        // Initialize Firebase
        const app = firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // This listener is the key: it waits for Firebase to check the auth state
        auth.onAuthStateChanged(async (user) => {
          if (user) {
            try {
              const userDoc = await db.collection("users").doc(user.uid).get();
              // Once the user is found (or not), set loading to false
              setAuthServices(prev => ({ 
                ...prev, 
                currentUser: userDoc.exists ? { uid: user.uid, ...userDoc.data() } : null, 
                loading: false 
              }));
            } catch (error) {
              console.error('Error fetching user data:', error);
              setAuthServices(prev => ({ ...prev, currentUser: null, loading: false }));
            }
          } else {
            // If there's no user, set loading to false
            setAuthServices(prev => ({ ...prev, currentUser: null, loading: false }));
          }
        });

        const login = (email, password) => auth.signInWithEmailAndPassword(email, password);
        
        const register = async (email, password, name, role) => {
          const userCredential = await auth.createUserWithEmailAndPassword(email, password);
          const newUser = {
            name, 
            email, 
            role,
            username: nameToUsername(name),
            groupId: null
          };
          await db.collection("users").doc(userCredential.user.uid).set(newUser);
          return userCredential;
        };
        
        const logout = () => auth.signOut();

        setAuthServices(prev => ({
          ...prev,
          login,
          register,
          logout,
          db,
        }));

      } catch (error) {
        console.error("Firebase initialization failed", error);
        // If there's an error, set loading to false
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
