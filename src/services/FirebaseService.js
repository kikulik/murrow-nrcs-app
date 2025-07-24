// src/services/FirebaseService.js
// Service layer for Firebase operations
// FIX: Standardized dynamic import to use 'firebase/firestore'

export class FirebaseService {
    constructor(db) {
        this.db = db;
    }

    async saveItem(item, collectionName) {
        try {
            const { collection, doc, updateDoc, addDoc } = await import("firebase/firestore");

            if (item.id) {
                const docRef = doc(this.db, collectionName, item.id);
                const { id, ...dataToUpdate } = item;
                await updateDoc(docRef, dataToUpdate);
            } else {
                const itemToSave = { ...item };
                if (collectionName === 'stories') {
                    itemToSave.created = itemToSave.created || new Date().toISOString();
                    itemToSave.comments = itemToSave.comments || [];
                    itemToSave.status = itemToSave.status || 'draft';
                }
                await addDoc(collection(this.db, collectionName), itemToSave);
            }
        } catch (error) {
            console.error(`Error saving to collection '${collectionName}':`, error);
            throw error;
        }
    }

    async deleteItem(id, collectionName) {
        try {
            const { doc, deleteDoc } = await import("firebase/firestore");
            await deleteDoc(doc(this.db, collectionName, id));
        } catch (error) {
            console.error(`Error deleting from collection '${collectionName}':`, error);
            throw error;
        }
    }

    async sendMessage(userId, userName, text) {
        try {
            const { collection, addDoc } = await import("firebase/firestore");
            const newMessage = {
                userId,
                userName,
                text,
                timestamp: new Date().toISOString()
            };
            await addDoc(collection(this.db, "messages"), newMessage);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async sendStoryToRundown(storyId, rundownId, stories, rundowns) {
        try {
            const { doc, getDoc, updateDoc } = await import("firebase/firestore");

            const story = stories.find(s => s.id === storyId);
            if (!story) {
                throw new Error("Story not found");
            }

            const rundownRef = doc(this.db, "rundowns", rundownId);
            const rundownDoc = await getDoc(rundownRef);
            if (!rundownDoc.exists()) {
                throw new Error("Rundown not found");
            }

            const rundownData = rundownDoc.data();
            const defaultVideoType = ['PKG', 'VO', 'SOT', 'VID'].find(type =>
                story.title.toUpperCase().includes(`[${type}]`)
            );

            const newRundownItem = {
                id: Date.now(),
                time: "00:00:00",
                title: story.title,
                duration: story.duration || "01:00",
                type: defaultVideoType ? [defaultVideoType] : ['PKG'],
                content: story.content,
                storyId: story.id,
                storyStatus: 'Not Ready',
            };

            const updatedItems = [...(rundownData.items || []), newRundownItem];
            await updateDoc(rundownRef, { items: updatedItems });

        } catch (error) {
            console.error("Error sending story to rundown:", error);
            throw error;
        }
    }
}
