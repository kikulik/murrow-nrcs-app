// src/features/stories/components/CreateFolderModal.jsx
import React, { useState } from 'react';
import CustomIcon from '../../../components/ui/CustomIcon';
import ModalBase from '../../../components/common/ModalBase';
import InputField from '../../../components/ui/InputField';
import SelectField from '../../../components/ui/SelectField';
import {
    generateDateFolder,
    createStoryFolder,
    validateFolderName,
    sanitizeFolderName,
    getFoldersByDate,
    sortFoldersByDate,
    persistFolder
} from '../../../utils/folderHelpers';
import { useAppContext } from '../../../context/AppContext';

const CreateFolderModal = ({ onCancel, onFolderCreated }) => {
    const { appState } = useAppContext();
    const [folderType, setFolderType] = useState('date');
    const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));
    const [parentFolder, setParentFolder] = useState(generateDateFolder());
    const [folderName, setFolderName] = useState('');
    const [creating, setCreating] = useState(false);

    const existingFolders = getFoldersByDate(appState.stories);
    const existingDateFolders = sortFoldersByDate(Array.from(existingFolders.keys()));

    const handleCreate = async () => {
        let newFolderPath;
        if (folderType === 'date') {
            newFolderPath = customDate;
        } else {
            if (!validateFolderName(folderName)) {
                alert('Please enter a valid folder name');
                return;
            }

            const sanitizedName = sanitizeFolderName(folderName);
            newFolderPath = createStoryFolder(parentFolder, sanitizedName);
        }

        setCreating(true);
        try {
            persistFolder(newFolderPath);
            if (onFolderCreated) {
                onFolderCreated(newFolderPath);
            }
            onCancel();
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Failed to create folder. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const getPreviewPath = () => {
        if (folderType === 'date') {
            return customDate;
        } else {
            return createStoryFolder(parentFolder, sanitizeFolderName(folderName));
        }
    };

    return (
        <ModalBase onCancel={onCancel} title="Create New Folder" maxWidth="max-w-md">
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Folder Type
                    </label>
                    <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                value="date"
                                checked={folderType === 'date'}
                                onChange={(e) => setFolderType(e.target.value)}
                                className="h-4 w-4"
                            />
                            <span>New Date Folder</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                value="subfolder"
                                checked={folderType === 'subfolder'}
                                onChange={(e) => setFolderType(e.target.value)}
                                className="h-4 w-4"
                            />
                            <span>Subfolder in existing date</span>
                        </label>
                    </div>
                </div>

                {folderType === 'date' ? (
                    <InputField
                        label="Date (YYYY-MM-DD)"
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                    />
                ) : (
                    <>
                        <SelectField
                            label="Parent Date Folder"
                            value={parentFolder}
                            onChange={(e) => setParentFolder(e.target.value)}
                            options={[
                                { value: generateDateFolder(), label: `${generateDateFolder()} (Today)` },
                                ...existingDateFolders.map(folder => ({
                                    value: folder,
                                    label: folder
                                }))
                            ]}
                        />

                        <InputField
                            label="Subfolder Name"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            placeholder="Enter folder name..."
                        />
                    </>
                )}

                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Preview:
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono break-words">
                        {getPreviewPath() || 'Enter folder details...'}
                    </p>
                </div>

                {folderType === 'subfolder' && folderName && !validateFolderName(folderName) && (
                    <div className="text-sm text-red-600">
                        Folder name contains invalid characters. It will be sanitized to: {sanitizeFolderName(folderName)}
                    </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-4">
                    <button type="button" onClick={onCancel} className="btn-secondary">
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={creating || (folderType === 'subfolder' && !folderName.trim())}
                        className="btn-primary"
                    >
                        <CustomIcon name="add story" size={40} />
                        <span>{creating ? 'Creating...' : 'Create Folder'}</span>
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

export default CreateFolderModal;
