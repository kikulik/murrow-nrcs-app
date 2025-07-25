// src/components/collaboration/StoryEditTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import CustomIcon from '../ui/CustomIcon';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import InputField from '../ui/InputField';
import UserPresenceIndicator from './UserPresenceIndicator';
import { RUNDOWN_ITEM_TYPES } from '../../lib/constants';
import { calculateReadingTime, getWordCount } from '../../utils/textDurationCalculator';
import { useDirectRundownCollaboration } from '../../hooks/useDirectRundownCollaboration';
import { useSimpleCollaboration } from '../../hooks/useSimpleCollaboration';
import CollaborativeTextEditor from './CollaborativeTextEditor';

const StoryEditTab = ({ itemId }) => {
    const { currentUser } = useAuth();
    const { appState, closeStoryTab, updateStoryTab, setAppState } = useAppContext();

    const {
        isOwner,
        isTakenOver,
        takenOverBy,
        handleTakeOver,
        saveChanges,
        stopEditing,
        editingData
    } = useDirectRundownCollaboration(itemId);

    const {
        content,
        setContent,
        saveTextOperation
    } = useSimpleCollaboration(itemId, isOwner);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        duration: '01:00',
        type: ['STD']
    });
    const [useCalculatedDuration, setUseCalculatedDuration] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (editingData) {
            setFormData({
                title: editingData.title || '',
                content: editingData.content || '',
                duration: editingData.duration || '01:00',
                type: Array.isArray(editingData.type) ? editingData.type : [editingData.type || 'STD']
            });
        }
    }, [editingData]);

    const calculatedDuration = calculateReadingTime(content);
    const wordCount = getWordCount(content);

    useEffect(() => {
        if (useCalculatedDuration && isOwner) {
            setFormData(prev => ({
                ...prev,
                duration: calculatedDuration
            }));
        }
    }, [calculatedDuration, useCalculatedDuration, isOwner]);

    const autoSave = useCallback(async () => {
        if (itemId && hasUnsavedChanges && isOwner) {
            setIsSaving(true);
            await saveChanges(formData);
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            setIsSaving(false);
        }
    }, [itemId, formData, hasUnsavedChanges, isOwner, saveChanges]);

    useEffect(() => {
        if (isOwner && hasUnsavedChanges) {
            const autoSaveInterval = setInterval(autoSave, 5000);
            return () => clearInterval(autoSaveInterval);
        }
    }, [autoSave, isOwner, hasUnsavedChanges]);

    const handleFormChange = (field, value) => {
        if (!isOwner) return;
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleTypeChange = (type) => {
        if (!isOwner) return;
        const newTypes = formData.type.includes(type)
            ? formData.type.filter(t => t !== type)
            : [...formData.type, type];
        handleFormChange('type', newTypes);
    };

    const handleClose = async () => {
        if (hasUnsavedChanges && isOwner) {
            const shouldSave = window.confirm('You have unsaved changes. Save before closing?');
            if (shouldSave) {
                await autoSave();
            }
        }
        await stopEditing();
        closeStoryTab(itemId);
    };

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    if (!itemId) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">No item ID provided</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
                    notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                    notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                    'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                    <div className="flex items-center justify-between">
                        <span>{notification.message}</span>
                        <button onClick={() => setNotification(null)} className="ml-4 text-gray-500 hover:text-gray-700">×</button>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Edit Story</h2>
                    <UserPresenceIndicator itemId={itemId} />
                    {!isOwner && isTakenOver && takenOverBy && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                            <CustomIcon name="lock" size={32} className="text-orange-600" />
                            <span className="text-sm text-orange-800 dark:text-orange-200">{takenOverBy} is editing</span>
                            <button onClick={handleTakeOver} className="ml-2 px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700">Take Over</button>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {lastSaved && isOwner && (
                        <span className="text-sm text-gray-500">Last saved: {lastSaved.toLocaleTimeString()}</span>
                    )}
                    {isSaving && (
                        <span className="text-sm text-blue-600 flex items-center gap-1">
                            <CustomIcon name="save" size={32} className="animate-pulse" /> Saving...
                        </span>
                    )}
                    {hasUnsavedChanges && !isSaving && isOwner && (
                        <span className="text-sm text-orange-600">Unsaved changes</span>
                    )}
                    <button onClick={handleClose} className="btn-secondary" type="button">
                        <CustomIcon name="cancel" size={40} /> <span>Close</span>
                    </button>
                </div>
            </div>

            {!isOwner && isTakenOver && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                        <CustomIcon name="lock" size={40} className="text-orange-600" />
                        <div>
                            <h4 className="font-medium text-orange-800 dark:text-orange-200">Story is Being Edited</h4>
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                                {takenOverBy} is currently editing this story. You can view the content but cannot make changes unless you take over.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 ${!isOwner ? 'opacity-75' : ''}`}>
                <div className="space-y-6">
                    <InputField
                        label="Title"
                        value={formData.title}
                        onChange={(e) => handleFormChange('title', e.target.value)}
                        disabled={!isOwner}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <InputField
                            label="Duration"
                            value={formData.duration}
                            onChange={(e) => handleFormChange('duration', e.target.value)}
                            placeholder="MM:SS"
                            disabled={useCalculatedDuration || !isOwner}
                        />
                        <div className="flex flex-col justify-end">
                            <label className="flex items-center space-x-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={useCalculatedDuration}
                                    onChange={(e) => setUseCalculatedDuration(e.target.checked)}
                                    disabled={!isOwner}
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item Type(s)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {Object.entries(RUNDOWN_ITEM_TYPES).map(([abbr, name]) => (
                                <label
                                    key={abbr}
                                    className={`flex items-center space-x-2 p-2 rounded-md border border-gray-300 dark:border-gray-600 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${!isOwner ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.type.includes(abbr)}
                                        onChange={() => handleTypeChange(abbr)}
                                        disabled={!isOwner}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium">{abbr}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                        {!isOwner ? (
                            <div className="min-h-[300px] p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                    {content || 'No content available'}
                                </div>
                            </div>
                        ) : (
                            <CollaborativeTextEditor
                                value={content}
                                onChange={(newText) => {
                                    saveTextOperation(formData.content, newText);
                                    setContent(newText);
                                    handleFormChange('content', newText);
                                }}
                                itemId={itemId}
                                isOwner={isOwner}
                                placeholder="Enter story content..."
                                rows={12}
                                className="min-h-[300px]"
                            />
                        )}
                    </div>

                    {isOwner && (
                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="text-xs text-gray-500">
                                Auto-save every 5 seconds
                            </div>
                            <div className="flex gap-3">
                                <button onClick={autoSave} disabled={!hasUnsavedChanges || isSaving} className="btn-secondary" type="button">
                                    <CustomIcon name="save" size={32} /> <span>Save Draft</span>
                                </button>
                                <button onClick={autoSave} disabled={isSaving} className="btn-primary" type="button">
                                    <CustomIcon name="save" size={40} /> <span>{isSaving ? 'Saving...' : 'Save & Update'}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryEditTab;
