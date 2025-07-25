// src/hooks/useFirestoreData.js
// Custom hook for Firestore data management with improved error handling

// FIX: Import doc and updateDoc for rundown synchronization
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";

export const setupFirestoreListeners = async (db, setAppState) => {

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
                    if (error.code === 'permission-denied') {
                        console.warn(`Permission denied for ${collectionName}, likely due to logout`);
                    } else if (error.code === 'unavailable') {
                        console.warn(`Firestore unavailable for ${collectionName}, will retry automatically`);
                    }
                }
            );
        } catch (error) {
            console.error(`Error creating listener for ${collectionName}:`, error);
            return () => { };
        }
    };

    // FIX: A special listener for the 'stories' collection. This is the core of the solution.
    // It listens for changes to any story and automatically updates any rundown that contains that story.
    const createStoriesListener = () => {
        try {
            const collectionRef = collection(db, "stories");
            return onSnapshot(
                collectionRef,
                (snapshot) => {
                    const stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    // Use setAppState's callback form to get the most recent state of rundowns
                    // before we update the stories in our app's state.
                    setAppState(prev => {
                        const currentRundowns = prev.rundowns;

                        // This array will hold all the database update operations we need to perform.
                        const updatePromises = [];
                        
                        // snapshot.docChanges() is the most efficient way to see exactly what changed.
                        for (const change of snapshot.docChanges()) {
                            if (change.type === 'modified') {
                                const updatedStory = { id: change.doc.id, ...change.doc.data() };

                                // Find every rundown that contains an item linked to the story that just changed.
                                const affectedRundowns = currentRundowns.filter(rundown =>
                                    rundown.items?.some(item => item.storyId === updatedStory.id)
                                );

                                for (const rundown of affectedRundowns) {
                                    // Create a new 'items' array for the rundown with the updated story data.
                                    const updatedItems = rundown.items.map(item => {
                                        if (item.storyId === updatedStory.id) {
                                            // Update the rundown item with the new story data,
                                            // but carefully preserve rundown-specific fields like id, time, and storyStatus.
                                            return {
                                                ...item,
                                                title: updatedStory.title,
                                                content: updatedStory.content,
                                                duration: updatedStory.duration,
                                                type: updatedStory.tags || item.type, // Sync story tags to rundown item type
                                                authorId: updatedStory.authorId,
                                            };
                                        }
                                        return item;
                                    });

                                    // Prepare the database update operation.
                                    const rundownRef = doc(db, "rundowns", rundown.id);
                                    updatePromises.push(updateDoc(rundownRef, { items: updatedItems }));
                                }
                            }
                        }

                        // Asynchronously execute all the updates. We don't need to wait for them
                        // to finish before updating our local UI state. Firestore's own listeners
                        // will eventually pick up these changes and ensure the UI is consistent.
                        if (updatePromises.length > 0) {
                            Promise.all(updatePromises).catch(error => {
                                console.error("Error syncing story changes to rundowns:", error);
                            });
                        }

                        // Finally, update the app's state with the new list of stories.
                        return { ...prev, stories };
                    });
                },
                (error) => {
                    console.error(`Error in stories listener:`, error);
                }
            );
        } catch (error) {
            console.error(`Error creating listener for stories:`, error);
            return () => {};
        }
    };

    const unsubscribers = [
        createListener("users", "users"),
        createListener("groups", "groups"),
        createStoriesListener(), // Use our new, powerful stories listener.
        createListener("assignments", "assignments"),
        createListener("rundowns", "rundowns"),
        createListener("rundownTemplates", "rundownTemplates"),
        createListener("messages", "messages", "timestamp")
    ].filter(Boolean);

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
