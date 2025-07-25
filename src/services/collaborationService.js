import { db } from '../firebase'; // Your firebase config
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';

export const getEditingInfo = async (itemId) => {
    const docRef = doc(db, 'editingStatus', itemId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        return snapshot.data();
    }
    return null;
};

export const requestTakeOver = async (itemId, previousUserId) => {
    const docRef = doc(db, 'editingStatus', itemId);
    try {
        await updateDoc(docRef, {
            userId: null,
            userName: null,
            takenOverBy: previousUserId,
            timestamp: serverTimestamp()
        });
        return true;
    } catch (err) {
        console.error('Failed to take over:', err);
        return false;
    }
};

export const stopEditingRundownItem = async (itemId) => {
    const docRef = doc(db, 'editingStatus', itemId);
    await updateDoc(docRef, {
        userId: null,
        userName: null,
        timestamp: serverTimestamp()
    });
};

export const subscribeToEditingData = (itemId, callback) => {
    const docRef = doc(db, 'rundownItems', itemId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data());
        }
    });
    return unsubscribe;
};

export const saveRundownItem = async (itemId, data) => {
    const docRef = doc(db, 'rundownItems', itemId);
    await setDoc(docRef, {
        ...data,
        lastModified: serverTimestamp()
    }, { merge: true });
};

export const subscribeToContentChanges = (itemId, callback) => {
    const docRef = doc(db, 'rundownContent', itemId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data().content || '');
        }
    });
    return unsubscribe;
};

export const sendContentUpdate = async (itemId, content) => {
    const docRef = doc(db, 'rundownContent', itemId);
    await setDoc(docRef, {
        content,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

export const saveTextDiff = async (itemId, prev, next) => {
    // Optional: Store diff for history/auditing
    const diffRef = doc(db, 'rundownDiffs', `${itemId}_${Date.now()}`);
    await setDoc(diffRef, {
        itemId,
        previous: prev,
        next,
        changedAt: serverTimestamp()
    });
};
