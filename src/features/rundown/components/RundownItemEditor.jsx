import React, { useState, useEffect } from 'react';
import CustomIcon from '../../../components/ui/CustomIcon';
import InputField from '../../../components/ui/InputField';
import CollaborativeTextEditor from '../../../components/collaboration/CollaborativeTextEditor';
import UserPresenceIndicator from '../../../components/collaboration/UserPresenceIndicator';
import { RUNDOWN_ITEM_TYPES } from '../../../lib/constants';
import { useCollaboration } from '../../../context/CollaborationContext';
import { useAuth } from '../../../context/AuthContext';
import { calculateReadingTime, getWordCount } from '../../../utils/textDurationCalculator';

const RundownItemEditor = ({ item, onSave, onCancel }) => {
    const { currentUser } = useAuth();
    const { setEditingItem, clearEditingItem, isItemBeingEdited } = useCollaboration();
    const [formData, setFormData] = useState(item);
    const [showConflictWarning, setShowConflictWarning] = useState(false);
    const [useCalculatedDuration, setUseCalculatedDuration] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const wordCount = getWordCount(formData.content);
    const calculatedDuration = calculateReadingTime(formData.content);

    useEffect(() => {
        setFormData(item);
        setEditingItem(item.id);

        if (isItemBeingEdited(item.id)) {
            setShowConflictWarning(true);
        }

        return () => {
            clearEditingItem();
        };
    }, [item, setEditingItem, clearEditingItem, isItemBeingEdited]);

    useEffect(() => {
        if (useCalculatedDuration) {
            setFormData(prev => ({
                ...prev,
                duration: calculatedDuration
            }));
        }
    }, [calculatedDuration, useCalculatedDuration]);

    const handleSave = async (e) => {
        e.stopPropagation();
        setIsSaving(true);

        try {
            const updatedItem = {
                ...formData,
                version: (item.version || 1) + 1,
                lastModified: new Date().toISOString(),
                lastModifiedBy: currentUser.uid
            };

            await onSave(item.id, updatedItem);
            await clearEditingItem();
        } catch (error) {
            console.error('Error saving item:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = async (e) => {
        e.stopPropagation();
        await clearEditingItem();
        onCancel();
    };

    const handleContentChange = (newContent) => {
        setFormData({ ...formData, content: newContent });
    };

    return (
        <div className="p-6 bg-blue-50 dark:bg-gray-700/50 border-l-4 border-blue-500 relative min-h-[600px]">
            <div className="absolute top-2 right-2">
                <UserPresenceIndicator itemId={item.id} />
            </div>

            {showConflictWarning && (
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-md">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Another user is currently editing this item. Your changes may conflict with theirs.
                            </p>
                        </div>
                        <div className="ml-auto pl-3">
                            <button
                                onClick={() => setShowConflictWarning(false)}
                                className="text-yellow-400 hover:text-yellow-600"
                            >
                                <span className="sr-only">Dismiss</span>
                                ×
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6 h-full flex flex-col">
                <InputField
                    label="Title"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                    <InputField
                        label="Duration"
                        value={formData.duration}
                        onChange={e => setFormData({ ...formData, duration: e.target.value })}
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Item Type(s)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.keys(RUNDOWN_ITEM_TYPES).map(abbr => (
                            <label key={abbr} className="flex items-center space-x-2 p-2 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer has-[:checked]:bg-blue-100 dark:has-[:checked]:bg-blue-900/50">
                                <input
                                    type="checkbox"
                                    checked={Array.isArray(formData.type) && formData.type.includes(abbr)}
                                    onChange={() => {
                                        const currentTypes = Array.isArray(formData.type) ? formData.type : [];
                                        const newTypes = currentTypes.includes(abbr)
                                            ? currentTypes.filter(t => t !== abbr)
                                            : [...currentTypes, abbr];
                                        setFormData({ ...formData, type: newTypes });
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm">{abbr}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Content
                    </label>
                    <CollaborativeTextEditor
                        value={formData.content}
                        onChange={handleContentChange}
                        itemId={item.id}
                        placeholder="Script or content..."
                        rows={12}
                        className="min-h-[300px]"
                    />
                </div>

                <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    Version {item.version || 1} • Last modified: {item.lastModified ? new Date(item.lastModified).toLocaleString() : 'Never'}
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                    <button onClick={handleCancel} className="btn-secondary" disabled={isSaving}>
                        <CustomIcon name="cancel" size={16} />
                        <span>Cancel</span>
                    </button>
                    <button onClick={handleSave} className="btn-primary" disabled={isSaving}>
                        <CustomIcon name="save" size={16} />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RundownItemEditor;
