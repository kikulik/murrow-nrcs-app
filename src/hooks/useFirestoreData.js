// src/hooks/useFirestoreData.js
// Custom hook for Firestore data management
export const setupFirestoreListeners = async (db, setAppState) => {
    const { collection, onSnapshot } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

    const unsubscribers = [
        onSnapshot(collection(db, "users"), (snapshot) =>
            setAppState(prev => ({ ...prev, users: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }))
        ),
        onSnapshot(collection(db, "groups"), (snapshot) =>
            setAppState(prev => ({ ...prev, groups: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }))
        ),
        onSnapshot(collection(db, "stories"), (snapshot) =>
            setAppState(prev => ({ ...prev, stories: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }))
        ),
        onSnapshot(collection(db, "assignments"), (snapshot) =>
            setAppState(prev => ({ ...prev, assignments: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }))
        ),
        onSnapshot(collection(db, "rundowns"), (snapshot) =>
            setAppState(prev => ({ ...prev, rundowns: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }))
        ),
        onSnapshot(collection(db, "rundownTemplates"), (snapshot) =>
            setAppState(prev => ({ ...prev, rundownTemplates: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }))
        ),
        onSnapshot(collection(db, "messages"), (snapshot) =>
            setAppState(prev => ({ ...prev, messages: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) }))
        ),
    ];

    return () => unsubscribers.forEach(unsub => unsub());
};