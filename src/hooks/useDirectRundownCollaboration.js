// src/hooks/useDirectRundownCollaboration.js
import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

export const useDirectRundownCollaboration = (db, rundownId, itemId, currentUser) => {
    const [rundownData, setRundownData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = useRef(null);
    const unsubscribeRef = useRef(null);

    // Listen to rundown changes
    useEffect(() => {
        if (!db || !rundownId) return;

        const rundownRef = doc(db, 'rundowns', rundownId);

        unsubscribeRef.current = onSnapshot(rundownRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                setRundownData(docSnapshot.data());
            }
            setIsLoading(false);
        }, (error) => {
            console.error('Rundown listener error:', error);
            setIsLoading(false);
        });

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, [db, rundownId]);

    // Get current item
    const currentItem = rundownData?.items?.find(item =>
        item.id.toString() === itemId.toString()
    );

    // Save function with debouncing
    const saveItem = (updatedItemData) => {
        if (!db || !rundownId || !rundownData) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setIsSaving(true);

        // Debounce the save
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                const rundownRef = doc(db, 'rundowns', rundownId);

                const updatedItems = rundownData.items.map(item =>
                    item.id.toString() === itemId.toString()
                        ? {
                            ...item,
                            ...updatedItemData,
                            lastModified: new Date().toISOString(),
                            lastModifiedBy: currentUser.uid
                        }
                        : item
                );

                await updateDoc(rundownRef, {
                    items: updatedItems,
                    lastModified: new Date().toISOString(),
                    lastModifiedBy: currentUser.uid
                });

                setIsSaving(false);
            } catch (error) {
                console.error('Error saving item:', error);
                setIsSaving(false);
            }
        }, 1000); // 1 second debounce
    };

    return {
        currentItem,
        isLoading,
        isSaving,
        saveItem
    };
};

// src/components/DirectCollaborativeEditor.jsx
import React, { useState, useEffect } from 'react';
import { useDirectRundownCollaboration } from '../hooks/useDirectRundownCollaboration';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import CustomIcon from './ui/CustomIcon';
import InputField from './ui/InputField';
import { RUNDOWN_ITEM_TYPES } from '../lib/constants';
import { calculateReadingTime, getWordCount } from '../utils/textDurationCalculator';

const DirectCollaborativeEditor = ({ itemId }) => {
    const { db, currentUser } = useAuth();
    const { appState, closeStoryTab } = useAppContext();
    const { currentItem, isLoading, isSaving, saveItem } = useDirectRundownCollaboration(
        db,
        appState.activeRundownId,
        itemId,
        currentUser
    );

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        duration: '01:00',
        type: ['STD']
    });
    const [useCalculatedDuration, setUseCalculatedDuration] = useState(true);
    const [notification, setNotification] = useState(null);

    // Update form when item changes
    useEffect(() => {
        if (currentItem) {
            setFormData({
                title: currentItem.title || '',
                content: currentItem.content || '',
                duration: currentItem.duration || '01:00',
                type: Array.isArray(currentItem.type) ? currentItem.type : [currentItem.type || 'STD']
            });
        }
    }, [currentItem]);

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

    const handleInputChange = (field, value) => {
        const newFormData = { ...formData, [field]: value };
        setFormData(newFormData);
        saveItem(newFormData);
    };

    const handleTypeChange = (type) => {
        const newTypes = formData.type.includes(type)
            ? formData.type.filter(t => t !== type)
            : [...formData.type, type];
        handleInputChange('type', newTypes);
    };

    const handleClose = () => {
        closeStoryTab(itemId);
    };

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (!currentItem) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Story not found</p>
                    <button onClick={handleClose} className="btn-secondary">
                        Close Tab
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                    notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                        'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                    <div className="flex items-center justify-between">
                        <span>{notification.message}</span>
                        <button
                            onClick={() => setNotification(null)}
                            className="ml-4 text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Edit Story</h2>
                    {isSaving && (
                        <span className="text-sm text-blue-600 flex items-center gap-1">
                            <CustomIcon name="save" size={32} className="animate-pulse" />
                            Saving...
                        </span>
                    )}
                </div>
                <button onClick={handleClose} className="btn-secondary">
                    <CustomIcon name="cancel" size={40} />
                    <span>Close</span>
                </button>
            </div>

            {/* Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <div className="space-y-6">
                    {/* Title */}
                    <InputField
                        label="Title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                    />

                    {/* Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <InputField
                            label="Duration"
                            value={formData.duration}
                            onChange={(e) => handleInputChange('duration', e.target.value)}
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

                    {/* Item Types */}
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

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Content
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => handleInputChange('content', e.target.value)}
                            rows={12}
                            className="w-full form-input min-h-[300px]"
                            placeholder="Enter story content..."
                        />
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-xs text-gray-500">
                            Changes are saved automatically • Version {currentItem?.version || 1}
                        </div>
                        {currentItem?.lastModified && (
                            <div className="text-xs text-gray-500">
                                Last updated: {new Date(currentItem.lastModified).toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DirectCollaborativeEditor;