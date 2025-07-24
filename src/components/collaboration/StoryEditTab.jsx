// src/components/collaboration/StoryEditTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import CustomIcon from '../ui/CustomIcon';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { useCollaboration } from '../../context/CollaborationContext';
import InputField from '../ui/InputField';
import CollaborativeTextEditor from './CollaborativeTextEditor';
import UserPresenceIndicator from './UserPresenceIndicator';
import { RUNDOWN_ITEM_TYPES } from '../../lib/constants';
import { calculateReadingTime, getWordCount } from '../../utils/textDurationCalculator';

const StoryEditTab = () => {
    const { currentUser, db } = useAuth();
    const { appState, setAppState } = useAppContext();
    const { 
        stopEditingStory, 
        saveStoryProgress, 
        getStoryProgress,
        safeUpdateRundown 
    } = useCollaboration();

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

    const isStoryTakenOver = appState.editingStoryTakenOver;
    const takenOverBy = appState.editingStoryTakenOverBy;
    const itemId = appState.editingStoryId;

    useEffect(() => {
        if (appState.editingStoryData) {
            setFormData({
                title: appState.editingStoryData.title || '',
                content: appState.editingStoryData.content || '',
                duration: appState.editingStoryData.duration || '01:00',
                type: Array.isArray(appState.editingStoryData.type) ? appState.editingStoryData.type : [appState.editingStoryData.type || 'STD']
            });
        }
    }, [appState.editingStoryData]);

    useEffect(() => {
        const loadSavedProgress = async () => {
            if (itemId) {
                const savedData = await getStoryProgress(itemId);
                if (savedData) {
                    setFormData(savedData);
                    setLastSaved(new Date());
                }
            }
        };
        loadSavedProgress();
    }, [itemId, getStoryProgress]);

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

    const autoSave = useCallback(async () => {
        if (itemId && hasUnsavedChanges && !isStoryTakenOver) {
            setIsSaving(true);
            await saveStoryProgress(itemId, formData);
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            setIsSaving(false);
        }
    }, [itemId, formData, hasUnsavedChanges, isStoryTakenOver, saveStoryProgress]);

    useEffect(() => {
        const autoSaveInterval = setInterval(autoSave, 5000);
        return () => clearInterval(autoSaveInterval);
    }, [autoSave]);

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleTypeChange = (type) => {
        const newTypes = formData.type.includes(type)
            ? formData.type.filter(t => t !== type)
            : [...formData.type, type];
        handleFormChange('type', newTypes);
    };

    const handleSave = async () => {
        if (!itemId || !appState.activeRundownId || isStoryTakenOver) return;

        setIsSaving(true);
        try {
            await safeUpdateRundown(appState.activeRundownId, (rundownData) => ({
                ...rundownData,
                items: rundownData.items.map(item =>
                    item.id === itemId
                        ? {
                            ...item,
                            title: formData.title,
                            content: formData.content,
                            duration: formData.duration,
                            type: formData.type,
                            version: (item.version || 1) + 1,
                            lastModified: new Date().toISOString(),
                            lastModifiedBy: currentUser.uid
                        }
                        : item
                )
            }));

            setHasUnsavedChanges(false);
            setLastSaved(new Date());
            alert('Story saved successfully!');
        } catch (error) {
            console.error('Error saving story:', error);
            alert('Failed to save story. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = async () => {
        if (hasUnsavedChanges && !isStoryTakenOver) {
            const shouldSave = confirm('You have unsaved changes. Do you want to save before closing?');
            if (shouldSave) {
                await autoSave();
            }
        }

        await stopEditingStory();
        setAppState(prev => ({ ...prev, activeTab: 'rundown' }));
    };

    if (!itemId) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">No story selected for editing</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Edit Story</h2>
                    <UserPresenceIndicator itemId={itemId} />
                </div>
                <div className="flex items-center gap-4">
                    {lastSaved && (
                        <span className="text-sm text-gray-500">
                            Last saved: {lastSaved.toLocaleTimeString()}
                        </span>
                    )}
                    {isSaving && (
                        <span className="text-sm text-blue-600 flex items-center gap-1">
                            <CustomIcon name="save" size={32} className="animate-pulse" />
                            Saving...
                        </span>
                    )}
                    {hasUnsavedChanges && !isSaving && (
                        <span className="text-sm text-orange-600">Unsaved changes</span>
                    )}
                    <button onClick={handleClose} className="btn-secondary">
                        <CustomIcon name="cancel" size={40} />
                        <span>Close</span>
                    </button>
                </div>
            </div>

            {isStoryTakenOver && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                        <CustomIcon name="notification" size={40} className="text-red-600" />
                        <div>
                            <h4 className="font-medium text-red-800 dark:text-red-200">Story Taken Over</h4>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                This story has been taken over by {takenOverBy}. Your progress has been saved.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 ${isStoryTakenOver ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-6">
                    <InputField
                        label="Title"
                        value={formData.title}
                        onChange={(e) => handleFormChange('title', e.target.value)}
                        disabled={isStoryTakenOver}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <InputField
                            label="Duration"
                            value={formData.duration}
                            onChange={(e) => handleFormChange('duration', e.target.value)}
                            placeholder="MM:SS"
                            disabled={useCalculatedDuration || isStoryTakenOver}
                        />
                        <div className="flex flex-col justify-end">
                            <label className="flex items-center space-x-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={useCalculatedDuration}
                                    onChange={(e) => setUseCalculatedDuration(e.target.checked)}
                                    disabled={isStoryTakenOver}
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
                                    className={`flex items-center space-x-2 p-2 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-900/50 ${isStoryTakenOver ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.type.includes(abbr)}
                                        onChange={() => handleTypeChange(abbr)}
                                        disabled={isStoryTakenOver}
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
                        <CollaborativeTextEditor
                            value={formData.content}
                            onChange={(content) => handleFormChange('content', content)}
                            itemId={itemId}
                            placeholder="Enter story content..."
                            rows={12}
                            className="min-h-[300px]"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-xs text-gray-500">
                            Auto-save every 5 seconds • Version {appState.editingStoryData?.version || 1}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={autoSave}
                                disabled={!hasUnsavedChanges || isSaving || isStoryTakenOver}
                                className="btn-secondary"
                            >
                                <CustomIcon name="save" size={32} />
                                <span>Save Draft</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || isStoryTakenOver}
                                className="btn-primary"
                            >
                                <CustomIcon name="save" size={40} />
                                <span>{isSaving ? 'Saving...' : 'Save & Update'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoryEditTab;
