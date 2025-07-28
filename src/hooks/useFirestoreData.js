// src/hooks/useFirestoreData.js
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

    const createStoriesListener = () => {
        try {
            const collectionRef = collection(db, "stories");
            return onSnapshot(
                collectionRef,
                (snapshot) => {
                    const stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    setAppState(prev => {
                        const currentRundowns = prev.rundowns;

                        const updatePromises = [];
                        
                        for (const change of snapshot.docChanges()) {
                            if (change.type === 'modified') {
                                const updatedStory = { id: change.doc.id, ...change.doc.data() };

                                const affectedRundowns = currentRundowns.filter(rundown =>
                                    rundown.items?.some(item => item.storyId === updatedStory.id)
                                );

                                for (const rundown of affectedRundowns) {
                                    const updatedItems = rundown.items.map(item => {
                                        if (item.storyId === updatedStory.id) {
                                            return {
                                                ...item,
                                                title: updatedStory.title,
                                                content: updatedStory.content,
                                                duration: updatedStory.duration,
                                                type: updatedStory.tags || item.type,
                                                authorId: updatedStory.authorId,
                                            };
                                        }
                                        return item;
                                    });

                                    const rundownRef = doc(db, "rundowns", rundown.id);
                                    updatePromises.push(updateDoc(rundownRef, { items: updatedItems }));
                                }
                            }
                        }

                        if (updatePromises.length > 0) {
                            Promise.all(updatePromises).catch(error => {
                                console.error("Error syncing story changes to rundowns:", error);
                            });
                        }

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

    const createRundownsListener = () => {
        try {
            const collectionRef = collection(db, "rundowns");
            return onSnapshot(
                collectionRef,
                (snapshot) => {
                    const rundowns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    setAppState(prev => {
                        const newState = { ...prev, rundowns };
                        
                        if (prev.editingStoryTabs.length > 0) {
                            const activeRundown = rundowns.find(r => r.id === prev.activeRundownId);
                            if (activeRundown) {
                                const updatedTabs = prev.editingStoryTabs.map(tab => {
                                    const updatedItem = activeRundown.items?.find(
                                        item => item.id.toString() === tab.itemId.toString()
                                    );
                                    
                                    if (updatedItem && JSON.stringify(updatedItem) !== JSON.stringify(tab.storyData)) {
                                        console.log('Updating tab data for item:', tab.itemId, 'with latest rundown data');
                                        return {
                                            ...tab,
                                            storyData: updatedItem,
                                            title: updatedItem.title || tab.title
                                        };
                                    }
                                    return tab;
                                });
                                
                                newState.editingStoryTabs = updatedTabs;
                            }
                        }
                        
                        return newState;
                    });
                },
                (error) => {
                    console.error(`Error in rundowns listener:`, error);
                }
            );
        } catch (error) {
            console.error(`Error creating listener for rundowns:`, error);
            return () => {};
        }
    };

    const unsubscribers = [
        createListener("users", "users"),
        createListener("groups", "groups"),
        createStoriesListener(),
        createListener("assignments", "assignments"),
        createRundownsListener(),
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
