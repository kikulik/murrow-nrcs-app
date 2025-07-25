// src/hooks/useFirestoreData.js
// Custom hook for Firestore data management with improved error handling
export const setupFirestoreListeners = async (db, setAppState) => {
    const { collection, onSnapshot, query, orderBy } = await import("firebase/firestore");

    const createListener = (collectionName, stateKey, orderByField = null) => {
        try {
            const collectionRef = collection(db, collectionName);
            const queryRef = orderByField
                ? query(collectionRef, orderBy(orderByField, "asc"))
                : collectionRef;

            return onSnapshot(
                queryRef,
                (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setAppState(prev => ({ ...prev, [stateKey]: data }));
                },
                (error) => {
                    console.error(`Error in ${collectionName} listener:`, error);
                    // Don't throw error to prevent app crash
                    // Just log it and continue
                    if (error.code === 'permission-denied') {
                        console.warn(`Permission denied for ${collectionName}, likely due to logout`);
                    } else if (error.code === 'unavailable') {
                        console.warn(`Firestore unavailable for ${collectionName}, will retry automatically`);
                    }
                }
            );
        } catch (error) {
            console.error(`Error creating listener for ${collectionName}:`, error);
            return () => { }; // Return empty function if listener creation fails
        }
    };

    const unsubscribers = [
        createListener("users", "users"),
        createListener("groups", "groups"),
        createListener("stories", "stories"),
        createListener("assignments", "assignments"),
        createListener("rundowns", "rundowns"),
        createListener("rundownTemplates", "rundownTemplates"),
        createListener("messages", "messages", "timestamp")
    ].filter(Boolean); // Filter out any null/undefined listeners

    // Return a single cleanup function that unsubscribes from all listeners.
    return () => {
        unsubscribers.forEach(unsub => {
            try {
                unsub();
            } catch (error) {
                console.warn('Error unsubscribing from listener:', error);
            }
        });
    };
};
