// src/hooks/useDirectRundownCollaboration.js
import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getEditingInfo, requestTakeOver, saveRundownItem, stopEditingRundownItem, subscribeToEditingData } from '../services/collaborationService';

export const useDirectRundownCollaboration = (itemId) => {
    const { currentUser } = useAuth();
    const { appState, updateStoryTab } = useAppContext();

    const [isOwner, setIsOwner] = useState(false);
    const [isTakenOver, setIsTakenOver] = useState(false);
    const [takenOverBy, setTakenOverBy] = useState(null);
    const [editingData, setEditingData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribe;
        const init = async () => {
            setIsLoading(true);

            // Fetch who is editing this item
            const info = await getEditingInfo(itemId);
            const isBeingEditedByAnother = info && info.userId !== currentUser.uid;

            setIsOwner(!isBeingEditedByAnother);
            setIsTakenOver(isBeingEditedByAnother);
            setTakenOverBy(isBeingEditedByAnother ? info.userName : null);

            // Subscribe to real-time updates for the editing data
            unsubscribe = subscribeToEditingData(itemId, (data) => {
                setEditingData(data);
            });

            setIsLoading(false);
        };

        if (itemId && currentUser?.uid) {
            init();
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [itemId, currentUser?.uid]);

    const handleTakeOver = async () => {
        const info = await getEditingInfo(itemId);
        if (info?.userId && info.userId !== currentUser.uid) {
            const success = await requestTakeOver(itemId, info.userId);
            if (success) {
                updateStoryTab(itemId, {
                    isOwner: true,
                    takenOver: false,
                    takenOverBy: null
                });
                setIsOwner(true);
                setIsTakenOver(false);
                setTakenOverBy(null);
            }
        }
    };

    const saveChanges = async (data) => {
        if (!isOwner) return;
        await saveRundownItem(itemId, data);
    };

    const stopEditing = async () => {
        await stopEditingRundownItem(itemId);
    };

    return {
        isOwner,
        isTakenOver,
        takenOverBy,
        handleTakeOver,
        saveChanges,
        stopEditing,
        editingData,
        isLoading
    };
};
