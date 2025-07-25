// src/components/modals/AddStoryToRundownModal.jsx
import React, { useState, useEffect } from 'react';
import CustomIcon from '../ui/CustomIcon';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import ModalBase from '../common/ModalBase';
import InputField from '../ui/InputField';
import SelectField from '../ui/SelectField';
import { RUNDOWN_ITEM_TYPES } from '../../lib/constants';
import { calculateReadingTime, getWordCount } from '../../utils/textDurationCalculator';
import { generateDateFolder } from '../../utils/folderHelpers';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';

const AddStoryToRundownModal = ({ onCancel }) => {
    const { appState } = useAppContext();
    const { db, currentUser } = useAuth();
    const [tab, setTab] = useState('existing');
    const [selectedStoryId, setSelectedStoryId] = useState('');
    const [selectedTypes, setSelectedTypes] = useState(['STD']);
    const [newStoryData, setNewStoryData] = useState({
        title: '',
        content: '',
        duration: '01:00',
        authorId: currentUser?.uid || ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [useCalculatedDuration, setUseCalculatedDuration] = useState(true);

    const filteredStories = appState.stories.filter(story =>
        story.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const calculatedDuration = calculateReadingTime(newStoryData.content);
    const wordCount = getWordCount(newStoryData.content);

    useEffect(() => {
        if (tab === 'existing' && filteredStories.length > 0) {
            if (!filteredStories.find(s => s.id === selectedStoryId)) {
                setSelectedStoryId(filteredStories[0].id);
            }
        }
    }, [searchTerm, filteredStories, tab, selectedStoryId]);

    useEffect(() => {
        if (currentUser?.uid) {
            setNewStoryData(prev => ({
                ...prev,
                authorId: currentUser.uid
            }));
        }
    }, [currentUser]);

    useEffect(() => {
        if (useCalculatedDuration) {
            setNewStoryData(prev => ({
                ...prev,
                duration: calculatedDuration
            }));
        }
    }, [calculatedDuration, useCalculatedDuration]);

    const handleTypeChange = (type) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const handleContentChange = (e) => {
        const content = e.target.value;
        setNewStoryData({ ...newStoryData, content });
    };

    const handleSave = async () => {
        if (selectedTypes.length === 0) {
            alert("Please select at least one item type.");
            return;
        }

        if (!appState.activeRundownId) {
            alert("No active rundown selected.");
            return;
        }

        setSaving(true);
        try {
            const rundownRef = doc(db, "rundowns", appState.activeRundownId);
            const rundownDoc = await getDoc(rundownRef);

            if (!rundownDoc.exists()) {
                throw new Error("Rundown not found");
            }

            const rundownData = rundownDoc.data();
            let newRundownItem;

            if (tab === 'existing' && selectedStoryId) {
                const story = appState.stories.find(s => s.id === selectedStoryId);
                if (!story) {
                    throw new Error("Selected story not found");
                }

                newRundownItem = {
                    id: Date.now(),
                    time: "00:00:00",
                    title: story.title,
                    duration: story.duration || "01:00",
                    type: selectedTypes,
                    content: story.content,
                    storyId: story.id,
                    storyStatus: 'Not Ready',
                    authorId: story.authorId
                };
            } else {
                // FIX: Create a new story document first
                const newStory = {
                    title: newStoryData.title || `New ${selectedTypes[0]} Item`,
                    content: newStoryData.content,
                    duration: newStoryData.duration,
                    authorId: newStoryData.authorId || currentUser?.uid,
                    status: 'draft',
                    platform: 'broadcast',
                    created: new Date().toISOString(),
                    folder: generateDateFolder(),
                    tags: selectedTypes,
                    comments: []
                };
                const storyDocRef = await addDoc(collection(db, "stories"), newStory);

                // FIX: Create the rundown item and link it to the new story
                newRundownItem = {
                    id: Date.now(),
                    time: "00:00:00",
                    title: newStory.title,
                    duration: newStory.duration,
                    type: selectedTypes,
                    content: newStory.content,
                    storyId: storyDocRef.id, // <-- This is the crucial link
                    storyStatus: 'Ready for Air',
                    authorId: newStory.authorId
                };
            }

            const updatedItems = [...(rundownData.items || []), newRundownItem];
            await updateDoc(rundownRef, { items: updatedItems });

            onCancel();
        } catch (error) {
            console.error("Error adding item to rundown:", error);
            alert("Failed to add item to rundown. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalBase onCancel={onCancel} title="Add Item to Rundown" maxWidth="max-w-3xl">
            <div className="p-6 space-y-6">
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

                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setTab('existing')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${tab === 'existing'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            From Existing Story
                        </button>
                        <button
                            onClick={() => setTab('new')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${tab === 'new'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            As New Blank Item
                        </button>
                    </nav>
                </div>

                {tab === 'existing' ? (
                    <div className="space-y-4">
                        <InputField
                            label="Search Stories"
                            placeholder="Type to search for a story..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {filteredStories.length > 0 ? (
                            <SelectField
                                label="Select a Story"
                                value={selectedStoryId}
                                onChange={e => setSelectedStoryId(e.target.value)}
                                options={filteredStories.map(s => ({ value: s.id, label: s.title }))}
                            />
                        ) : (
                            <p className="text-sm text-gray-500">No stories found matching your search.</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <InputField
                            label="Title (optional)"
                            value={newStoryData.title}
                            onChange={e => setNewStoryData({ ...newStoryData, title: e.target.value })}
                            placeholder="Auto-named if left blank"
                        />
                        <SelectField
                            label="Author"
                            value={newStoryData.authorId}
                            onChange={e => setNewStoryData({ ...newStoryData, authorId: e.target.value })}
                            options={appState.users.map(u => ({ value: u.uid || u.id, label: u.name }))}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Duration"
                                value={newStoryData.duration}
                                onChange={e => setNewStoryData({ ...newStoryData, duration: e.target.value })}
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
                                        {wordCount} words • Est. {calculatedDuration} reading time
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Content
                            </label>
                            <textarea
                                value={newStoryData.content}
                                onChange={handleContentChange}
                                rows={5}
                                className="w-full form-input"
                                placeholder="Internal notes or script..."
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-4">
                    <button type="button" onClick={onCancel} className="btn-secondary">
                        <CustomIcon name="cancel" size={32} />
                        <span>Cancel</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn-primary"
                        disabled={saving || selectedTypes.length === 0 || (tab === 'existing' && !selectedStoryId && filteredStories.length > 0)}
                    >
                        <CustomIcon name="add story" size={32} />
                        <span>{saving ? 'Adding...' : 'Add to Rundown'}</span>
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

export default AddStoryToRundownModal;
