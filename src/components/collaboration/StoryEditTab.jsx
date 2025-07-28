// src/components/collaboration/StoryEditTab.jsx (Fixed Race Condition)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import CustomIcon from '../ui/CustomIcon';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { useCollaboration } from '../../context/CollaborationContext';
import InputField from '../ui/InputField';
import UserPresenceIndicator from './UserPresenceIndicator';
import { RUNDOWN_ITEM_TYPES } from '../../lib/constants';
import { calculateReadingTime, getWordCount } from '../../utils/textDurationCalculator';
import { doc, updateDoc } from 'firebase/firestore';

const StoryEditTab = ({ itemId }) => {
    const { currentUser, db } = useAuth();
    const { appState, closeStoryTab } = useAppContext();
    const {
        safeUpdateRundown,
        clearEditingItem,
        getUserEditingItem,
    } = useCollaboration();

    if (!itemId || !currentUser || !appState) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }
    
    const tab = appState.editingStoryTabs.find(t => t.itemId.toString() === itemId.toString());
    const initialData = tab?.storyData || {};
    const editingUser = getUserEditingItem(itemId);

    // FIX: This is the definitive fix. The logic now trusts the `tab.isOwner` property
    // passed during tab creation, which solves the race condition where the component
    // would render with stale real-time data.
    const isOwner = tab?.isOwner && !tab?.isBeingTakenOver;
    const isTakenOverByOther = !isOwner && editingUser && editingUser.userId !== currentUser.uid;
    const takenOverBy = isTakenOverByOther ? editingUser.userName : null;

    const [formData, setFormData] = useState({
        title: initialData.title || '',
        content: initialData.content || '',
        duration: initialData.duration || '01:00',
        type: Array.isArray(initialData.type) ? initialData.type : [initialData.type || 'STD'],
        authorId: initialData.authorId || currentUser.uid
    });

    const [useCalculatedDuration, setUseCalculatedDuration] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    // When the tab data is refreshed from the context (e.g., after a takeover),
    // update the form data to show the latest content.
    useEffect(() => {
        setFormData({
            title: initialData.title || '',
            content: initialData.content || '',
            duration: initialData.duration || '01:00',
            type: Array.isArray(initialData.type) ? initialData.type : [initialData.type || 'STD'],
            authorId: initialData.authorId || currentUser.uid
        });
    }, [initialData, currentUser.uid]);


    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const saveChanges = useCallback(async () => {
        if (!itemId || !appState.activeRundownId || !safeUpdateRundown || !db) {
            return false;
        }

        if (isSaving) return;

        try {
            setIsSaving(true);
            
            const rundownUpdatePromise = safeUpdateRundown(appState.activeRundownId, (rundownData) => {
                const newItems = rundownData.items.map(item =>
                    item.id.toString() === itemId.toString()
                        ? { ...item, ...formData, id: item.id }
                        : item
                );
                return { ...rundownData, items: newItems };
            });

            let storyUpdatePromise = Promise.resolve();
            if (initialData.storyId) {
                const storyRef = doc(db, "stories", initialData.storyId);
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
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            console.log('Story saved successfully');
            return true;
        } catch (error) {
            console.error("Failed to save changes:", error);
            showNotification("Failed to save changes.", "error");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [itemId, formData, appState.activeRundownId, safeUpdateRundown, initialData.storyId, db, isSaving]);


    const autoSave = useCallback(async () => {
        if (!itemId || !hasUnsavedChanges || !isOwner || !appState.activeRundownId || !safeUpdateRundown || !db) {
            return false;
        }
        return await saveChanges();
    }, [itemId, hasUnsavedChanges, isOwner, saveChanges]);

    const handleSaveAndClose = useCallback(async () => {
        if (hasUnsavedChanges && isOwner) {
            await saveChanges();
        }
        await clearEditingItem();
        closeStoryTab(itemId);
    }, [hasUnsavedChanges, isOwner, saveChanges, clearEditingItem, closeStoryTab, itemId]);
    
    const saveAndCloseForTakeover = useCallback(async () => {
        console.log('Takeover detected, forcing save and close for item:', itemId);
        
        if (isSaving) return;
        setIsSaving(true);
        
        try {
            if (hasUnsavedChanges) {
                await saveChanges();
                console.log('Force save completed for takeover.');
            }
        } catch (error) {
            console.error("Failed to force save changes during takeover:", error);
        } finally {
            setIsSaving(false);
            await clearEditingItem();
            closeStoryTab(itemId, true); 
            console.log('Force closed tab for takeover.');
        }
    }, [saveChanges, clearEditingItem, closeStoryTab, itemId, hasUnsavedChanges, isSaving]);


    useEffect(() => {
        if (tab?.isBeingTakenOver) {
            saveAndCloseForTakeover();
        }
    }, [tab?.isBeingTakenOver, saveAndCloseForTakeover]);

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

    useEffect(() => {
        if (isOwner && hasUnsavedChanges && !tab?.isBeingTakenOver) {
            const autoSaveInterval = setInterval(autoSave, 5000);
            return () => clearInterval(autoSaveInterval);
        }
    }, [autoSave, isOwner, hasUnsavedChanges, tab?.isBeingTakenOver]);

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
        try {
            if (hasUnsavedChanges && isOwner && !tab?.isBeingTakenOver) {
                const shouldSave = window.confirm('You have unsaved changes. Save before closing?');
                if (shouldSave) {
                    await saveChanges();
                }
            }
            if (clearEditingItem) {
                await clearEditingItem();
            }
            if (closeStoryTab && itemId) {
                closeStoryTab(itemId);
            }
        } catch (error) {
            console.error('Error in handleClose:', error);
        }
    };

    if (!itemId) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">No item ID provided</p>
            </div>
        );
    }

    const containerClasses = `space-y-6 ${isTakenOverByOther ? 'opacity-60 pointer-events-none' : ''}`;

    try {
        return (
            <div className={containerClasses}>
                {notification && (
                    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
                        notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                        notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                        'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span>{notification.message}</span>
                            <button onClick={() => setNotification(null)} className="ml-4 text-gray-500 hover:text-gray-700">&times;</button>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-semibold">Edit Story</h2>
                        <UserPresenceIndicator itemId={itemId} />
                        {isTakenOverByOther && takenOverBy && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                <CustomIcon name="lock" size={32} className="text-orange-600" />
                                <span className="text-sm text-orange-800 dark:text-orange-200">{takenOverBy} is editing</span>
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
                        <button onClick={handleClose} className="btn-secondary pointer-events-auto" type="button">
                            <CustomIcon name="cancel" size={40} /> <span>Close</span>
                        </button>
                    </div>
                </div>

                {isTakenOverByOther && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                            <CustomIcon name="lock" size={40} className="text-orange-600" />
                            <div>
                                <h4 className="font-medium text-orange-800 dark:text-orange-200">Story is Being Edited</h4>
                                <p className="text-sm text-orange-700 dark:text-orange-300">
                                    {takenOverBy} is currently editing this story. You can view the content but cannot make changes.
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
                                        {wordCount} words Ã¢â‚¬Â¢ Est. {calculatedDuration} reading time
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
                                            checked={Array.isArray(formData.type) && formData.type.includes(abbr)}
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
                            <textarea
                                value={formData.content}
                                onChange={(e) => handleFormChange('content', e.target.value)}
                                disabled={!isOwner}
                                placeholder="Enter story content..."
                                rows={12}
                                className="w-full form-input min-h-[300px]"
                            />
                        </div>

                        {isOwner && !tab?.isBeingTakenOver && (
                            <div className="flex items-center justify-between pt-4 border-t">
                                <div className="text-xs text-gray-500">
                                    Auto-save every 5 seconds
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handleSaveAndClose} disabled={isSaving} className="btn-primary" type="button">
                                        <CustomIcon name="save" size={40} /> <span>{isSaving ? 'Saving & Closing...' : 'Save & Close'}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error rendering StoryEditTab:', error);
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-500">Something went wrong</p>
                    <button onClick={() => closeStoryTab(itemId)} className="btn-secondary mt-4">
                        Close Tab
                    </button>
                </div>
            </div>
        );
    }
};

export default StoryEditTab;
