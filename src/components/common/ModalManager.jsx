// src/components/common/ModalManager.jsx
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import StoryEditor from '../../features/stories/components/StoryEditor';
import RundownEditor from '../modals/RundownEditor';
import AddStoryToRundownModal from '../modals/AddStoryToRundownModal';
import ConfirmationDialog from './ConfirmationDialog';
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const ModalManager = () => {
    const { appState, setAppState } = useAppContext();
    const { db } = useAuth(); // Get db instance for deletions

    const closeModal = () => {
        setAppState(prev => ({ ...prev, modal: null }));
    };

    const handleDelete = async (id, itemType) => {
        if (!db) return;
        try {
            // itemType should be the collection name e.g., 'stories', 'assignments'
            await deleteDoc(doc(db, itemType, id));
        } catch (error) {
            console.error(`Failed to delete item from ${itemType}:`, error);
        } finally {
            closeModal();
        }
    };

    if (!appState.modal) return null;

    const { type, ...modalProps } = appState.modal;

    switch (type) {
        case 'storyEditor':
            return <StoryEditor onCancel={closeModal} {...modalProps} />;
        case 'rundownEditor':
            return <RundownEditor onCancel={closeModal} {...modalProps} />;
        case 'addStoryToRundown':
            return <AddStoryToRundownModal onCancel={closeModal} {...modalProps} />;
        case 'deleteConfirm':
            return (
                <ConfirmationDialog
                    onCancel={closeModal}
                    onConfirm={() => handleDelete(modalProps.id, modalProps.itemType)}
                    title="Confirm Deletion"
                    message="Are you sure you want to delete this item? This action cannot be undone."
                    {...modalProps}
                />
            );
        default:
            return null;
    }
};

export default ModalManager;
