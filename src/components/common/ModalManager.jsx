// src/components/common/ModalManager.jsx
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useCollaboration } from '../../context/CollaborationContext';
import StoryEditor from '../../features/stories/components/StoryEditor';
import RundownEditor from '../modals/RundownEditor';
import AddStoryToRundownModal from '../modals/AddStoryToRundownModal';
import SendMultipleToStoriesModal from '../modals/SendMultipleToStoriesModal';
import CreateFolderModal from '../../features/stories/components/CreateFolderModal';
import ConfirmationDialog from './ConfirmationDialog';
import AlertDialog from './AlertDialog';
import { doc, deleteDoc } from 'firebase/firestore';
// Import the new AI modal
import AIGeneratorModal from '../../features/stories/components/AIGeneratorModal';

const ModalManager = () => {
    const { appState, setAppState, updateStoryTab } = useAppContext();
    const { db } = useAuth();
    const { markNotificationAsRead } = useCollaboration();

    const closeModal = () => {
        setAppState(prev => ({ ...prev, modal: null }));
    };

    const handleDelete = async (id, itemType) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, itemType, id));
        } catch (error) {
            console.error(`Failed to delete item from ${itemType}:`, error);
        } finally {
            closeModal();
        }
    };

    if (!appState.modal) return null;

    const { type, story, rundownItems, defaultFolder, ...modalProps } = appState.modal;

    switch (type) {
        case 'storyEditor':
            return (
                <StoryEditor
                    story={story}
                    onCancel={closeModal}
                    defaultFolder={defaultFolder}
                    {...modalProps}
                />
            );
        case 'rundownEditor':
            return <RundownEditor onCancel={closeModal} {...modalProps} />;
        case 'addStoryToRundown':
            return <AddStoryToRundownModal onCancel={closeModal} {...modalProps} />;
        case 'sendMultipleToStories':
            return (
                <SendMultipleToStoriesModal
                    rundownItems={rundownItems}
                    onCancel={closeModal}
                    {...modalProps}
                />
            );
        case 'createFolder':
            return <CreateFolderModal onCancel={closeModal} {...modalProps} />;
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
        
        // Add this case to handle the AI Generator Modal
        case 'aiGenerator':
            return (
                <AIGeneratorModal
                    onCancel={closeModal}
                    onGenerate={modalProps.onGenerate}
                    {...modalProps}
                />
            );

        case 'takeoverAlert':
            const handleCloseAlert = () => {
                // When the user acknowledges the alert, trigger the tab closure logic.
                updateStoryTab(modalProps.itemId, { isBeingTakenOver: true });

                // Find the original notification to mark it as read.
                const notification = appState.notifications.find(n =>
                    n.itemId === modalProps.itemId && n.type === 'takeOver' && !n.read
                );
                if (notification) {
                    markNotificationAsRead(notification.id);
                }
                closeModal();
            };
            return (
                <AlertDialog
                    title="Edit Session Taken Over"
                    message={modalProps.message}
                    onClose={handleCloseAlert}
                />
            );
        default:
            return null;
    }
};

export default ModalManager;
