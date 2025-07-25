import { doc, getDoc, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../firebase';
import { FirebaseService } from './FirebaseService';

const firebaseService = new FirebaseService(db);

export const getEditingInfo = async (itemId) => {
    const ref = doc(db, 'editingStatus', itemId);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
};

export const requestTakeOver = async (itemId, previousUserId) => {
    const ref = doc(db, 'editingStatus', itemId);
    try {
        await updateDoc(ref, {
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
    const ref = doc(db, 'editingStatus', itemId);
    await updateDoc(ref, {
        userId: null,
        userName: null,
        timestamp: serverTimestamp()
    });
};

export const subscribeToEditingData = (itemId, callback) => {
    const ref = doc(db, 'rundownItems', itemId);
    return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
            callback(snap.data());
        }
    });
};

export const saveRundownItem = async (itemId, data) => {
    const ref = doc(db, 'rundownItems', itemId);
    await setDoc(ref, {
        ...data,
        lastModified: serverTimestamp()
    }, { merge: true });
};

export const subscribeToContentChanges = (itemId, callback) => {
    const ref = doc(db, 'rundownContent', itemId);
    return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
            callback(snap.data().content || '');
        }
    });
};

export const sendContentUpdate = async (itemId, content) => {
    const ref = doc(db, 'rundownContent', itemId);
    await setDoc(ref, {
        content,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

export const saveTextDiff = async (itemId, prev, next) => {
    const diffRef = doc(db, 'rundownDiffs', `${itemId}_${Date.now()}`);
    await setDoc(diffRef, {
        itemId,
        previous: prev,
        next,
        changedAt: serverTimestamp()
    });
};
