// src/components/common/ModalManager.jsx
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import StoryEditor from '../../features/stories/components/StoryEditor';
import RundownEditor from '../modals/RundownEditor';
import AddStoryToRundownModal from '../modals/AddStoryToRundownModal';
import ConfirmationDialog from './ConfirmationDialog';

const ModalManager = () => {
    const { appState, setAppState } = useAppContext();
    const { db } = useAuth();

    const closeModal = () => {
        setAppState(prev => ({ ...prev, modal: null }));
    };

    const handleDelete = async (id, itemType) => {
        if (!db) return;
        try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
            await deleteDoc(doc(db, itemType, id));
        } catch (error) {
            console.error(`Failed to delete item from ${itemType}:`, error);
        } finally {
            closeModal();
        }
    };

    if (!appState.modal) return null;

    const { type, story, ...modalProps } = appState.modal;

    switch (type) {
        case 'storyEditor':
            return <StoryEditor story={story} onCancel={closeModal} {...modalProps} />;
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
