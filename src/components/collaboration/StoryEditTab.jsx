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

const StoryEditTab = ({ itemId }) => {
    const { currentUser } = useAuth();
    const { appState, closeStoryTab, updateStoryTab } = useAppContext();
    const {
        stopEditingStory,
        saveStoryProgress,
        getStoryProgress,
        safeUpdateRundown,
        takeOverStory,
        getUserEditingItem
    } = useCollaboration();

    // FIXED: Better way to find the tab and get ownership info
    const tab = appState.editingStoryTabs.find(t => t.itemId === itemId);
    const storyData = tab?.storyData;

    // FIXED: Also try to find the item in the current rundown if not in tab
    const rundownItem = React.useMemo(() => {
        console.log('=== DEBUGGING RUNDOWN ITEM LOOKUP ===');
        console.log('Looking for itemId:', itemId, 'Type:', typeof itemId);
        console.log('storyData from tab:', storyData);
        
        if (storyData) {
            console.log('Found storyData in tab, using it');
            return storyData;
        }
        
        const activeRundown = appState.rundowns.find(r => r.id === appState.activeRundownId);
        console.log('activeRundown found:', activeRundown);
        
        if (activeRundown?.items) {
            console.log('activeRundown.items:', activeRundown.items);
            
            // Try multiple comparison methods since ID types might differ
            const foundItem = activeRundown.items.find(item => {
                // Try exact match first
                if (item.id === itemId) return true;
                // Try string comparison
                if (String(item.id) === String(itemId)) return true;
                // Try number comparison
                if (Number(item.id) === Number(itemId)) return true;
                return false;
            });
            
            console.log('Found item:', foundItem);
            return foundItem;
        } else {
            console.log('No items in active rundown or no active rundown');
        }
        
        console.log('=== END DEBUG ===');
        return null;
    }, [storyData, appState.rundowns, appState.activeRundownId, itemId]);

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

    const isOwner = tab?.isOwner !== undefined ? tab.isOwner : true; // Default to true if not set
    const isTakenOver = tab?.takenOver || false;
    const takenOverBy = tab?.takenOverBy;
    const isReadOnly = isTakenOver && !isOwner;

    console.log('Ownership status:', { isOwner, isTakenOver, takenOverBy, tab });

    // FIXED: Initialize form data from rundownItem
    useEffect(() => {
        console.log('Initializing form data with:', rundownItem); // DEBUG
        if (rundownItem) {
            const data = {
                title: rundownItem.title || '',
                content: rundownItem.content || '',
                duration: rundownItem.duration || '01:00',
                type: Array.isArray(rundownItem.type) ? rundownItem.type : [rundownItem.type || 'STD']
            };
            console.log('Setting form data:', data); // DEBUG
            setFormData(data);
        }
    }, [rundownItem]);

    useEffect(() => {
        const loadSavedProgress = async () => {
            if (itemId && isOwner) {
                const savedData = await getStoryProgress(itemId);
                if (savedData) {
                    setFormData(savedData);
                    setLastSaved(new Date());
                }
            }
        };
        loadSavedProgress();
    }, [itemId, getStoryProgress, isOwner]);

    const calculatedDuration = calculateReadingTime(formData.content);
    const wordCount = getWordCount(formData.content);

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
            await saveStoryProgress(itemId, formData);
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            setIsSaving(false);
        }
    }, [itemId, formData, hasUnsavedChanges, isOwner, saveStoryProgress]);

    useEffect(() => {
        if (isOwner) {
            const autoSaveInterval = setInterval(autoSave, 5000);
            return () => clearInterval(autoSaveInterval);
        }
    }, [autoSave, isOwner]);

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

    const handleTakeOver = async () => {
        if (!takenOverBy || !itemId) return;

        const editingUser = getUserEditingItem(itemId);
        const confirmed = window.confirm(`${takenOverBy} is currently editing this story. Do you want to take over? Their progress will be saved.`);
        if (!confirmed) return;

        const success = await takeOverStory(itemId, editingUser?.userId);
        if (success) {
            updateStoryTab(itemId, {
                isOwner: true,
                takenOver: false,
                takenOverBy: null
            });
        } else {
            alert('Failed to take over the story. Please try again.');
        }
    };

    const handleSave = async () => {
        if (!itemId || !appState.activeRundownId || !isOwner) return;

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
        if (hasUnsavedChanges && isOwner) {
            const shouldSave = window.confirm('You have unsaved changes. Do you want to save before closing?');
            if (shouldSave) {
                await autoSave();
            }
        }

        await stopEditingStory(itemId);
        closeStoryTab(itemId);
    };

    // FIXED: Better error handling
    if (!itemId) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">No item ID provided</p>
            </div>
        );
    }

    if (!rundownItem) {
        console.error('Story/Item not found for ID:', itemId); // DEBUG
        console.log('Available rundowns:', appState.rundowns); // DEBUG
        console.log('Active rundown ID:', appState.activeRundownId); // DEBUG
        console.log('Editing tabs:', appState.editingStoryTabs); // DEBUG
        
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Story not found (ID: {itemId})</p>
                    <button onClick={handleClose} className="btn-secondary">
                        Close Tab
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Edit Story</h2>
                    <UserPresenceIndicator itemId={itemId} />
                    {!isOwner && isTakenOver && takenOverBy && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                            <CustomIcon name="lock" size={32} className="text-orange-600" />
                            <span className="text-sm text-orange-800 dark:text-orange-200">
                                {takenOverBy} is editing
                            </span>
                            <button
                                onClick={handleTakeOver}
                                className="ml-2 px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
                            >
                                Take Over
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {lastSaved && isOwner && (
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
                    {hasUnsavedChanges && !isSaving && isOwner && (
                        <span className="text-sm text-orange-600">Unsaved changes</span>
                    )}
                    {isReadOnly && (
                        <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            Read Only
                        </span>
                    )}
                    <button onClick={handleClose} className="btn-secondary">
                        <CustomIcon name="cancel" size={40} />
                        <span>Close</span>
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

            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 ${isReadOnly ? 'opacity-75' : ''}`}>
                <div className="space-y-6">
                    <InputField
                        label="Title"
                        value={formData.title}
                        onChange={(e) => handleFormChange('title', e.target.value)}
                        disabled={isReadOnly}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <InputField
                            label="Duration"
                            value={formData.duration}
                            onChange={(e) => handleFormChange('duration', e.target.value)}
                            placeholder="MM:SS"
                            disabled={useCalculatedDuration || isReadOnly}
                        />
                        <div className="flex flex-col justify-end">
                            <label className="flex items-center space-x-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={useCalculatedDuration}
                                    onChange={(e) => setUseCalculatedDuration(e.target.checked)}
                                    disabled={isReadOnly}
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
                                    className={`flex items-center space-x-2 p-2 rounded-md border border-gray-300 dark:border-gray-600 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-900/50 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.type.includes(abbr)}
                                        onChange={() => handleTypeChange(abbr)}
                                        disabled={isReadOnly}
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
                        {isReadOnly ? (
                            <div className="min-h-[300px] p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                    {formData.content || 'No content available'}
                                </div>
                            </div>
                        ) : (
                            <CollaborativeTextEditor
                                value={formData.content}
                                onChange={(content) => handleFormChange('content', content)}
                                itemId={itemId}
                                placeholder="Enter story content..."
                                rows={12}
                                className="min-h-[300px]"
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-xs text-gray-500">
                            {isOwner ? 'Auto-save every 5 seconds' : 'Real-time updates every 5 seconds'} • Version {rundownItem?.version || 1}
                        </div>
                        {isOwner && (
                            <div className="flex gap-3">
                                <button
                                    onClick={autoSave}
                                    disabled={!hasUnsavedChanges || isSaving}
                                    className="btn-secondary"
                                >
                                    <CustomIcon name="save" size={32} />
                                    <span>Save Draft</span>
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="btn-primary"
                                >
                                    <CustomIcon name="save" size={40} />
                                    <span>{isSaving ? 'Saving...' : 'Save & Update'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoryEditTab;
