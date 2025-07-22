// src/components/common/ModalManager.jsx
// Centralized modal management
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import StoryEditor from '../../features/stories/components/StoryEditor';
import RundownEditor from '../modals/RundownEditor';
import AddStoryToRundownModal from '../modals/AddStoryToRundownModal';
import ConfirmationDialog from './ConfirmationDialog';

const ModalManager = () => {
    const { appState, setAppState } = useAppContext();

    const closeModal = () => {
        setAppState(prev => ({ ...prev, modal: null }));
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
                    onConfirm={() => {
                        // Handle deletion logic here
                        closeModal();
                    }}
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