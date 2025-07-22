// src/components/modals/AddStoryToRundownModal.jsx
// Modal for adding stories to rundowns
import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import ModalBase from '../common/ModalBase';
import InputField from '../ui/InputField';
import SelectField from '../ui/SelectField';
import { RUNDOWN_ITEM_TYPES } from '../../lib/constants';

const AddStoryToRundownModal = ({ onCancel }) => {
    const { appState } = useAppContext();
    const [tab, setTab] = useState('existing');
    const [selectedStoryId, setSelectedStoryId] = useState('');
    const [selectedTypes, setSelectedTypes] = useState(['PKG']);
    const [newStoryData, setNewStoryData] = useState({
        title: '',
        content: '',
        duration: '01:00'
    });
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStories = appState.stories.filter(story =>
        story.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (tab === 'existing' && filteredStories.length > 0) {
            if (!filteredStories.find(s => s.id === selectedStoryId)) {
                setSelectedStoryId(filteredStories[0].id);
            }
        }
    }, [searchTerm, filteredStories, tab, selectedStoryId]);

    const handleTypeChange = (type) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const handleSave = () => {
        if (selectedTypes.length === 0) {
            console.log("Please select at least one item type.");
            return;
        }

        // Implementation for adding story to rundown
        onCancel();
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
                        <SelectField
                            label="Select a Story"
                            value={selectedStoryId}
                            onChange={e => setSelectedStoryId(e.target.value)}
                            options={filteredStories.map(s => ({ value: s.id, label: s.title }))}
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <InputField
                            label="Title (optional)"
                            value={newStoryData.title}
                            onChange={e => setNewStoryData({ ...newStoryData, title: e.target.value })}
                            placeholder="Auto-named if left blank"
                        />
                        <InputField
                            label="Duration"
                            value={newStoryData.duration}
                            onChange={e => setNewStoryData({ ...newStoryData, duration: e.target.value })}
                            placeholder="MM:SS"
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Content
                            </label>
                            <textarea
                                value={newStoryData.content}
                                onChange={e => setNewStoryData({ ...newStoryData, content: e.target.value })}
                                rows={5}
                                className="w-full form-input"
                                placeholder="Internal notes or script..."
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button
                        onClick={handleSave}
                        className="btn-primary"
                        disabled={selectedTypes.length === 0 || (tab === 'existing' && !selectedStoryId)}
                    >
                        <Check className="w-4 h-4" />
                        <span>Add to Rundown</span>
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

export default AddStoryToRundownModal;