import React, { createContext, useContext, useState, useEffect } from 'react';
import { nameToUsername } from '../utils/helpers'; // Assuming helpers.js is in utils

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
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js");
        const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js");
        const { getFirestore, doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // This listener is the key: it waits for Firebase to check the auth state
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            // Once the user is found (or not), set loading to false
            setAuthServices(prev => ({ ...prev, currentUser: userDoc.exists() ? { uid: user.uid, ...userDoc.data() } : null, loading: false }));
          } else {
            // If there's no user, set loading to false
            setAuthServices(prev => ({ ...prev, currentUser: null, loading: false }));
          }
        });

        const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
        const register = async (email, password, name, role) => {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = {
            name, email, role,
            username: nameToUsername(name),
            groupId: null
          };
          await setDoc(doc(db, "users", userCredential.user.uid), newUser);
          return userCredential;
        };
        const logout = () => signOut(auth);

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
