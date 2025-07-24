// src/features/stories/components/StoryEditor.jsx
import React, { useState, useEffect } from 'react';
import CustomIcon from '../../../components/ui/CustomIcon';
import { useAuth } from '../../../context/AuthContext';
import { useAppContext } from '../../../context/AppContext';
import ModalBase from '../../../components/common/ModalBase';
import InputField from '../../../components/ui/InputField';
import SelectField from '../../../components/ui/SelectField';
import { RUNDOWN_ITEM_TYPES, VIDEO_ITEM_TYPES } from '../../../lib/constants';
import { generateMediaId } from '../../../media/MediaManager';
import { calculateReadingTime, getWordCount } from '../../../utils/textDurationCalculator';
import {
    generateDateFolder,
    createStoryFolder,
    getFoldersByDate,
    sortFoldersByDate,
    validateFolderName,
    sanitizeFolderName,
    parseFolderPath
} from '../../../utils/folderHelpers';
const StoryEditor = ({ story = null, onCancel, defaultFolder = null }) => {
    const { currentUser, db } = useAuth();
    const { appState, setAppState } = useAppContext();

    const [formData, setFormData] = useState({
        title: story?.title || '',
        content: story?.content || '',
        authorId: story?.authorId || currentUser.uid,
        platform: story?.platform || 'broadcast',
        tags: story?.tags?.join(', ') || '',
        duration: story?.duration || '01:00',
        folder: story?.folder || defaultFolder || generateDateFolder()
    });
    const [selectedTypes, setSelectedTypes] = useState(
        story?.types || ['STD']
    );
    const [useCalculatedDuration, setUseCalculatedDuration] = useState(true);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    // Get existing folders
    const existingFolders = React.useMemo(() => {
        const folderMap = getFoldersByDate(appState.stories);

        // Also include folders that were created but are empty
        (appState.createdFolders || []).forEach(folderPath => {
            const { dateFolder, subFolder } = parseFolderPath(folderPath);
            if (!folderMap.has(dateFolder)) {
                folderMap.set(dateFolder, new Set());
            }
            if (subFolder) {
                folderMap.get(dateFolder).add(subFolder);
            }
        });

        const folders = new Set();

        folderMap.forEach((subFolders, dateFolder) => {
            folders.add(dateFolder);
            subFolders.forEach(subFolder => {
                folders.add(createStoryFolder(dateFolder, subFolder));
            });
        });

        // Always include current date
        folders.add(generateDateFolder());

        return Array.from(folders).sort();
    }, [appState.stories, appState.createdFolders]);
    const calculatedDuration = calculateReadingTime(formData.content);
    const wordCount = getWordCount(formData.content);

    useEffect(() => {
        if (useCalculatedDuration) {
            setFormData(prev => ({
                ...prev,
                duration: calculatedDuration
            }));
        }
    }, [calculatedDuration, useCalculatedDuration]);
    const handleTypeChange = (type) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const handleContentChange = (e) => {
        const content = e.target.value;
        setFormData({ ...formData, content });
    };

    const handleCreateFolder = () => {
        if (!validateFolderName(newFolderName)) {
            alert('Please enter a valid folder name');
            return;
        }

        const currentDate = generateDateFolder();
        const newFolder = createStoryFolder(currentDate, sanitizeFolderName(newFolderName));
        setAppState(prev => ({
            ...prev,
            createdFolders: [...new Set([...(prev.createdFolders || []), newFolder])]
        }));
        setFormData({ ...formData, folder: newFolder });
        setNewFolderName('');
        setShowCreateFolder(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { collection, addDoc, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
            const storyToSave = {
                ...formData,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
                authorId: currentUser.uid,
                status: story?.status || 'draft',
                created: story?.created || new Date().toISOString(),
                comments: story?.comments || [],
                types: selectedTypes // Store selected types
            };
            // Add video fields if video types are selected
            const isVideoStory = selectedTypes.some(type => VIDEO_ITEM_TYPES.includes(type));
            if (isVideoStory) {
                const videoType = selectedTypes.find(type => VIDEO_ITEM_TYPES.includes(type)) || 'PKG';
                storyToSave.mediaId = story?.mediaId || generateMediaId(videoType);
                storyToSave.hasVideo = story?.hasVideo || false;
                storyToSave.videoUrl = story?.videoUrl || null;
                storyToSave.videoStatus = story?.videoStatus || 'No Media';
            }

            if (story?.id) {
                await updateDoc(doc(db, "stories", story.id), storyToSave);
            } else {
                await addDoc(collection(db, "stories"), storyToSave);
            }

            onCancel();
        } catch (error) {
            console.error('Error saving story:', error);
        }
    };

    return (
        <ModalBase onCancel={onCancel} title={story ? "Edit Story" : "Create New Story"} maxWidth="max-w-4xl">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <InputField
                    label="Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Folder
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={formData.folder}
                            onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                            className="flex-1 form-input"
                        >
                            {existingFolders.map(folder => (
                                <option key={folder} value={folder}>{folder}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => setShowCreateFolder(true)}
                            className="btn-secondary"
                            title="Create new subfolder"
                        >
                            <CustomIcon name="add story" size={20} />
                        </button>
                    </div>

                    {showCreateFolder && (
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex gap-2">
                                <InputField
                                    label="New Subfolder Name"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Enter folder name..."
                                />
                                <div className="flex flex-col justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCreateFolder}
                                        disabled={!newFolderName.trim()}
                                        className="btn-primary text-sm"
                                    >
                                        Create
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateFolder(false);
                                            setNewFolderName('');
                                        }}
                                        className="btn-secondary text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Will be created as: {createStoryFolder(generateDateFolder(), newFolderName)}
                            </p>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Item Type(s)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {Object.entries(RUNDOWN_ITEM_TYPES).map(([abbr, name]) => (
                            <label
                                key={abbr}
                                className="flex items-center space-x-2 p-2 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-900/50"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedTypes.includes(abbr)}
                                    onChange={() => handleTypeChange(abbr)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium">{name} ({abbr})</span>
                            </label>
                        ))}
                    </div>
                </div>

                <SelectField
                    label="Author"
                    value={formData.authorId}
                    onChange={e => setFormData({ ...formData, authorId: e.target.value })}
                    options={appState.users.map(u => ({ value: u.uid || u.id, label: u.name }))}
                />

                <div className="grid grid-cols-2 gap-4">
                    <InputField
                        label="Duration"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        placeholder="MM:SS"
                        disabled={useCalculatedDuration}
                    />
                    <div className="flex flex-col justify-end">
                        <label className="flex items-center space-x-2 text-sm">
                            <input
                                type="checkbox"
                                checked={useCalculatedDuration}
                                onChange={e => setUseCalculatedDuration(e.target.checked)}
                                className="rounded"
                            />
                            <span>Auto-calculate from text</span>
                        </label>
                        {wordCount > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                {wordCount} words â€¢ Est. {calculatedDuration} reading time
                            </p>
                        )}
                    </div>
                </div>

                <InputField
                    label="Tags (comma separated)"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="news, breaking, local"
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Content
                    </label>
                    <textarea
                        value={formData.content}
                        onChange={handleContentChange}
                        rows={8}
                        className="w-full form-input"
                        placeholder="Enter story content..."
                        required
                    />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">
                        <CustomIcon name="save" size={32} />
                        <span>Save Story</span>
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

export default StoryEditor;
