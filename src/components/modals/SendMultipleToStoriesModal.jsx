// src/components/modals/SendMultipleToStoriesModal.jsx
import React, { useState, useEffect } from 'react';
import CustomIcon from '../ui/CustomIcon';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import ModalBase from '../common/ModalBase';
import SelectField from '../ui/SelectField';
import InputField from '../ui/InputField';
import { generateDateFolder, createStoryFolder } from '../../utils/folderHelpers';
import { collection, addDoc } from 'firebase/firestore';

const SendMultipleToStoriesModal = ({ rundownItems, onCancel }) => {
    const { db, currentUser } = useAuth();
    const { appState } = useAppContext();
    const [selectedFolder, setSelectedFolder] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [creating, setCreating] = useState(false);
    const [sending, setSending] = useState(false);

    const currentDateFolder = generateDateFolder();

    const availableFolders = React.useMemo(() => {
        const folders = new Set();
        appState.stories.forEach(story => {
            if (story.folder) {
                folders.add(story.folder);
            }
        });
        folders.add(currentDateFolder);
        return Array.from(folders).sort();
    }, [appState.stories, currentDateFolder]);

    useEffect(() => {
        setSelectedFolder(currentDateFolder);
    }, [currentDateFolder]);

    const handleCreateNewFolder = async () => {
        if (!newFolderName.trim()) return;
        const newFolder = createStoryFolder(currentDateFolder, newFolderName.trim());
        setSelectedFolder(newFolder);
        setNewFolderName('');
        setCreating(false);
    };

    const handleSend = async () => {
        if (!db || !rundownItems.length) return;

        setSending(true);
        try {
            for (const item of rundownItems) {
                const newStory = {
                    title: item.title,
                    content: item.content || '',
                    authorId: currentUser.uid,
                    status: 'draft',
                    platform: 'broadcast',
                    tags: item.type || [],
                    duration: item.duration,
                    created: new Date().toISOString(),
                    folder: selectedFolder,
                    comments: [],
                    sourceRundownId: item.rundownId || null,
                    sourceItemId: item.id
                };
                await addDoc(collection(db, "stories"), newStory);
            }
            alert(`Successfully sent ${rundownItems.length} item${rundownItems.length > 1 ? 's' : ''} to Stories`);
            onCancel();
        } catch (error) {
            console.error("Error sending items to stories:", error);
            alert("Failed to send items to stories. Please try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <ModalBase onCancel={onCancel} title={`Send ${rundownItems.length} Items to Stories`} maxWidth="max-w-2xl">
            <div className="p-6 space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Items to be sent:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {rundownItems.map((item, index) => (
                            <div key={item.id} className="text-sm bg-white dark:bg-gray-800 p-2 rounded">
                                <span className="font-medium">{index + 1}. {item.title}</span>
                                <span className="text-gray-500 ml-2">({item.duration})</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Select Folder
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={selectedFolder}
                                onChange={(e) => setSelectedFolder(e.target.value)}
                                className="flex-1 form-input"
                            >
                                {availableFolders.map(folder => (
                                    <option key={folder} value={folder}>{folder}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => setCreating(true)}
                                className="btn-secondary"
                                title="Create new subfolder"
                            >
                                <CustomIcon name="add story" size={20} />
                            </button>
                        </div>
                    </div>

                    {creating && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <InputField
                                        label="New Subfolder Name"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="Enter folder name..."
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Will be created as: {createStoryFolder(currentDateFolder, newFolderName)}
                                    </p>
                                </div>
                                <div className="flex flex-col justify-end gap-2">
                                    <button
                                        onClick={handleCreateNewFolder}
                                        disabled={!newFolderName.trim()}
                                        className="btn-primary text-sm"
                                    >
                                        Create
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCreating(false);
                                            setNewFolderName('');
                                        }}
                                        className="btn-secondary text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <h5 className="font-medium mb-2">What will happen:</h5>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <li>• {rundownItems.length} new stories will be created in the "{selectedFolder}" folder</li>
                            <li>• Each story will be set to "draft" status</li>
                            <li>• You will be set as the author</li>
                            <li>• Stories will maintain their titles and content from rundown items</li>
                            <li>• Original rundown items will remain unchanged</li>
                        </ul>
                    </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button
                        onClick={handleSend}
                        className="btn-primary"
                        disabled={sending || !selectedFolder}
                    >
                        <CustomIcon name="send" size={20} />
                        <span>{sending ? 'Sending...' : `Send ${rundownItems.length} Items`}</span>
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

export default SendMultipleToStoriesModal;
