// src/components/modals/QuickEditModal.jsx
import React, { useState, useEffect } from 'react';
import CustomIcon from '../ui/CustomIcon';
import ModalBase from '../common/ModalBase';
import InputField from '../ui/InputField';
import SelectField from '../ui/SelectField';
import { RUNDOWN_ITEM_TYPES } from '../../lib/constants';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useCollaboration } from '../../context/CollaborationContext';
import { calculateReadingTime, getWordCount } from '../../utils/textDurationCalculator';
import { doc, updateDoc } from 'firebase/firestore';

const QuickEditModal = () => {
    const { appState, setQuickEditItem } = useAppContext();
    const { currentUser, db } = useAuth();
    const { safeUpdateRundown } = useCollaboration();

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        duration: '01:00',
        type: ['STD'],
        authorId: ''
    });
    const [useCalculatedDuration, setUseCalculatedDuration] = useState(true);
    const [saving, setSaving] = useState(false);

    const item = appState.quickEditItem;

    useEffect(() => {
        if (item) {
            setFormData({
                title: item.title || '',
                content: item.content || '',
                duration: item.duration || '01:00',
                type: Array.isArray(item.type) ? item.type : [item.type || 'STD'],
                authorId: item.authorId || currentUser.uid
            });
        }
    }, [item, currentUser.uid]);

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
        setFormData(prev => ({
            ...prev,
            type: prev.type.includes(type)
                ? prev.type.filter(t => t !== type)
                : [...prev.type, type]
        }));
    };

    const handleSave = async () => {
        if (!appState.activeRundownId || !item) return;

        setSaving(true);
        try {
            // FIX: Update both the rundown item and the story document
            const rundownUpdatePromise = safeUpdateRundown(appState.activeRundownId, (rundownData) => ({
                ...rundownData,
                items: rundownData.items.map(rundownItem =>
                    rundownItem.id === item.id
                        ? {
                            ...rundownItem,
                            title: formData.title,
                            content: formData.content,
                            duration: formData.duration,
                            type: formData.type,
                            authorId: formData.authorId,
                        }
                        : rundownItem
                )
            }));

            let storyUpdatePromise = Promise.resolve();
            if (item.storyId) {
                const storyRef = doc(db, "stories", item.storyId);
                const storyUpdates = {
                    title: formData.title,
                    content: formData.content,
                    duration: formData.duration,
                    tags: formData.type,
                    authorId: formData.authorId,
                };
                storyUpdatePromise = updateDoc(storyRef, storyUpdates);
            }

            await Promise.all([rundownUpdatePromise, storyUpdatePromise]);

            handleCancel();
        } catch (error) {
            console.error('Error updating item:', error);
            alert('Failed to update item. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setQuickEditItem(null);
    };

    if (!item) {
        return null;
    }

    return (
        <ModalBase onCancel={handleCancel} title="Quick Edit" maxWidth="max-w-2xl">
            <div className="p-6 space-y-4">
                <InputField
                    label="Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />

                <SelectField
                    label="Author"
                    value={formData.authorId}
                    onChange={(e) => setFormData({ ...formData, authorId: e.target.value })}
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
                                onChange={(e) => setUseCalculatedDuration(e.target.checked)}
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Item Type(s)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(RUNDOWN_ITEM_TYPES).map(([abbr, name]) => (
                            <label
                                key={abbr}
                                className="flex items-center space-x-2 p-2 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-900/50"
                            >
                                <input
                                    type="checkbox"
                                    checked={formData.type.includes(abbr)}
                                    onChange={() => handleTypeChange(abbr)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium">{abbr}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Content
                    </label>
                    <textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={6}
                        className="w-full form-input"
                        placeholder="Enter story content..."
                    />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                    <button type="button" onClick={handleCancel} className="btn-secondary">
                        <CustomIcon name="cancel" size={32} />
                        <span>Cancel</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn-primary"
                        disabled={saving}
                    >
                        <CustomIcon name="save" size={32} />
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

export default QuickEditModal;
