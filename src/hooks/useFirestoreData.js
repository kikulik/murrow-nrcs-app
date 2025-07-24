// src/hooks/useFirestoreData.js
// Custom hook for Firestore data management
// FIX: Standardized the dynamic import to use 'firebase/firestore' for consistency
// across the application.
export const setupFirestoreListeners = async (db, setAppState) => {
    const { collection, onSnapshot, query, orderBy } = await import("firebase/firestore");

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
        // FIX: Added a query with orderBy to ensure messages are always sorted by timestamp from Firestore.
        onSnapshot(query(collection(db, "messages"), orderBy("timestamp", "asc")), (snapshot) =>
            setAppState(prev => ({ ...prev, messages: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }))
        ),
    ];

    // Return a single cleanup function that unsubscribes from all listeners.
    return () => unsubscribers.forEach(unsub => unsub());
};
