// src/lib/firebase.js
// Firebase configuration and initialization
import { nameToUsername } from '../utils/helpers';

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

export const initializeFirebase = async () => {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js");
    const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js");
    const { getFirestore, doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

    const register = async (email, password, name, role) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = {
            name, email, role,
            username: nameToUsername(name),
            groupId: null // Will be set based on group policies
        };
        await setDoc(doc(db, "users", userCredential.user.uid), newUser);
        return userCredential;
    };

    const logout = () => signOut(auth);

    return { auth, db, login, register, logout };
};