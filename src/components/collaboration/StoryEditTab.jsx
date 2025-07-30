// src/components/collaboration/StoryEditTab.jsx (Remove Premature Clear)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import CustomIcon from '../ui/CustomIcon';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { useCollaboration } from '../../context/CollaborationContext';
import InputField from '../ui/InputField';
import UserPresenceIndicator from './UserPresenceIndicator';
import { RUNDOWN_ITEM_TYPES } from '../../lib/constants';
import { calculateReadingTime, getWordCount } from '../../utils/textDurationCalculator';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import VideoPlayer from '../common/VideoPlayer'; // ADDED: Import VideoPlayer

const StoryEditTab = ({ itemId }) => {
    const { currentUser, db } = useAuth();
    const { appState, closeStoryTab } = useAppContext();
    const {
        safeUpdateRundown,
        getUserEditingItem,
        stopEditingStory
    } = useCollaboration();

    const tab = appState.editingStoryTabs.find(t => t.itemId.toString() === itemId.toString());
    const editingUser = getUserEditingItem(itemId);

    const isOwner = tab?.isOwner && !tab?.isBeingTakenOver;
    const isTakenOverByOther = !isOwner && editingUser && editingUser.userId !== currentUser.uid;
    const takenOverBy = isTakenOverByOther ? editingUser.userName : null;

    // ADDED: video fields to initial state
    const [formData, setFormData] = useState({
        title: '', content: '', duration: '01:00', type: ['STD'], authorId: currentUser.uid,
        proxyPath: null, videoStatus: null
    });
    const [useCalculatedDuration, setUseCalculatedDuration] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const isClosingRef = useRef(false);

    const fetchFreshStory = useCallback(async () => {
        if (!db || !tab?.storyData?.storyId) return;
        try {
            const storyRef = doc(db, 'stories', tab.storyData.storyId);
            const snap = await getDoc(storyRef);
            if (snap.exists()) {
                const data = snap.data();
                // ADDED: video fields to setFormData
                setFormData({
                    title: data.title || '',
                    content: data.content || '',
                    duration: data.duration || '01:00',
                    type: Array.isArray(data.tags) ? data.tags : [data.tags || 'STD'],
                    authorId: data.authorId || currentUser.uid,
                    proxyPath: data.proxyPath || null,
                    videoStatus: data.videoStatus || null,
                });
            }
        } catch (error) {
            console.error('Error fetching fresh story:', error);
        }
    }, [db, tab?.storyData?.storyId, currentUser.uid]);

    useEffect(() => {
        if (isOwner && tab?.storyData?.storyId) {
            fetchFreshStory();
        } else if (tab?.storyData) { // MODIFIED: Check for tab.storyData
            // ADDED: video fields to setFormData
            setFormData({
                title: tab.storyData.title || '',
                content: tab.storyData.content || '',
                duration: tab.storyData.duration || '01:00',
                type: Array.isArray(tab.storyData.type) ? tab.storyData.type : [tab.storyData.type || 'STD'],
                authorId: tab.storyData.authorId || currentUser.uid,
                proxyPath: tab.storyData.proxyPath || null,
                videoStatus: tab.storyData.videoStatus || null,
            });
        }
    }, [tab?.storyData, isOwner, fetchFreshStory, currentUser.uid]); // MODIFIED: Added currentUser.uid dependency

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const saveChanges = useCallback(async () => {
        if (!itemId || !appState.activeRundownId || !safeUpdateRundown || !db || isSaving) return false;
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
            if (tab?.storyData?.storyId) {
                const storyRef = doc(db, "stories", tab.storyData.storyId);
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
            return true;
        } catch (error) {
            console.error("Failed to save changes:", error);
            showNotification("Failed to save changes.", "error");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [itemId, formData, appState.activeRundownId, safeUpdateRundown, tab?.storyData?.storyId, db, isSaving]);

    const autoSave = useCallback(async () => {
        if (!itemId || !hasUnsavedChanges || !isOwner || !appState.activeRundownId || !safeUpdateRundown || !db || isClosingRef.current) return false;
        return await saveChanges();
    }, [itemId, hasUnsavedChanges, isOwner, saveChanges]);

    const handleSaveAndClose = useCallback(async () => {
        isClosingRef.current = true;
        try {
            if (hasUnsavedChanges && isOwner) await saveChanges();
            await stopEditingStory(itemId);
            closeStoryTab(itemId);
        } finally {
            isClosingRef.current = false;
        }
    }, [hasUnsavedChanges, isOwner, saveChanges, stopEditingStory, closeStoryTab, itemId]);

    const saveAndCloseForTakeover = useCallback(async () => {
        if (isSaving) return;
        isClosingRef.current = true;
        setIsSaving(true);
        try {
            if (hasUnsavedChanges) await saveChanges();
        } catch (error) {
            console.error("Failed to force save during takeover:", error);
        } finally {
            setIsSaving(false);
            await stopEditingStory(itemId);
            closeStoryTab(itemId, true);
            isClosingRef.current = false;
        }
    }, [saveChanges, stopEditingStory, closeStoryTab, itemId, hasUnsavedChanges, isSaving]);

    useEffect(() => {
        if (tab?.isBeingTakenOver) saveAndCloseForTakeover();
    }, [tab?.isBeingTakenOver, saveAndCloseForTakeover]);

    const calculatedDuration = calculateReadingTime(formData.content);
    const wordCount = getWordCount(formData.content);

    useEffect(() => {
        if (useCalculatedDuration && isOwner) {
            setFormData(prev => ({ ...prev, duration: calculatedDuration }));
        }
    }, [calculatedDuration, useCalculatedDuration, isOwner]);

    useEffect(() => {
        if (isOwner && hasUnsavedChanges && !tab?.isBeingTakenOver && !isClosingRef.current) {
            const autoSaveInterval = setInterval(autoSave, 5000);
            return () => clearInterval(autoSaveInterval);
        }
    }, [autoSave, isOwner, hasUnsavedChanges, tab?.isBeingTakenOver]);

    const handleFormChange = (field, value) => {
        if (!isOwner || isClosingRef.current) return;
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleTypeChange = (type) => {
        if (!isOwner || isClosingRef.current) return;
        const newTypes = formData.type.includes(type)
            ? formData.type.filter(t => t !== type)
            : [...formData.type, type];
        handleFormChange('type', newTypes);
    };

    const handleClose = async () => {
        isClosingRef.current = true;
        try {
            if (hasUnsavedChanges && isOwner && !tab?.isBeingTakenOver) {
                const shouldSave = window.confirm('You have unsaved changes. Save before closing?');
                if (shouldSave) await saveChanges();
            }
            await stopEditingStory(itemId);
            if (closeStoryTab && itemId) closeStoryTab(itemId);
        } catch (error) {
            console.error('Error in handleClose:', error);
        } finally {
            isClosingRef.current = false;
        }
    };

    const containerClasses = `space-y-6 ${isTakenOverByOther ? 'opacity-60 pointer-events-none' : ''}`;

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

            {/* ADDED: flex container for two-column layout */}
            <div className="flex gap-6">
                {/* Main Editor Column */}
                <div className={`flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 ${!isOwner ? 'opacity-75' : ''}`}>
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
                                        {wordCount} words â€¢ Est. {calculatedDuration} reading time
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
                
                {/* ADDED: Video Player Column */}
                <div className="w-1/3">
                     <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 sticky top-20">
                        <h3 className="text-lg font-semibold mb-4">Video Preview</h3>
                        <div className="aspect-video">
                           <VideoPlayer src={formData.proxyPath} status={formData.videoStatus} />
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            <p><strong>Status:</strong> {formData.videoStatus || 'Not Attached'}</p>
                            <p className="truncate"><strong>Proxy:</strong> {formData.proxyPath || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoryEditTab;
