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

const StoryEditor = ({ story = null, onCancel }) => {
    const { currentUser, db } = useAuth();
    const { appState } = useAppContext();

    const [formData, setFormData] = useState({
        title: story?.title || '',
        content: story?.content || '',
        authorId: story?.authorId || currentUser.uid,
        platform: story?.platform || 'broadcast',
        tags: story?.tags?.join(', ') || '',
        duration: story?.duration || '01:00'
    });

    const [selectedTypes, setSelectedTypes] = useState(
        story?.types || ['STD']
    );

    const [useCalculatedDuration, setUseCalculatedDuration] = useState(true);

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
                comments: story?.comments || []
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
