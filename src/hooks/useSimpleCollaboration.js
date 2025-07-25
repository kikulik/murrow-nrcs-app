// src/hooks/useSimpleCollaboration.js
import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';

export const useSimpleCollaboration = (db, itemId, currentUser, initialData) => {
    const [data, setData] = useState(initialData || {});
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [editingUsers, setEditingUsers] = useState([]);
    const saveTimeoutRef = useRef(null);
    const unsubscribeRef = useRef(null);

    // Listen to real-time changes
    useEffect(() => {
        if (!db || !itemId) return;

        const itemRef = doc(db, 'collaborativeItems', itemId.toString());

        unsubscribeRef.current = onSnapshot(itemRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const docData = docSnapshot.data();
                setData(docData);
                setEditingUsers(docData.editingUsers || []);
                setLastUpdated(docData.lastModified);
            } else {
                // Create document if it doesn't exist
                updateDoc(itemRef, {
                    ...initialData,
                    editingUsers: [],
                    lastModified: serverTimestamp(),
                    createdBy: currentUser.uid
                }).catch(console.error);
            }
            setIsLoading(false);
        }, (error) => {
            console.error('Collaboration listener error:', error);
            setIsLoading(false);
        });

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, [db, itemId, currentUser.uid]);

    // Join editing session
    useEffect(() => {
        if (!db || !itemId || isLoading) return;

        const joinSession = async () => {
            try {
                const itemRef = doc(db, 'collaborativeItems', itemId.toString());
                const currentEditingUsers = editingUsers.filter(user => user.id !== currentUser.uid);

                await updateDoc(itemRef, {
                    editingUsers: [
                        ...currentEditingUsers,
                        {
                            id: currentUser.uid,
                            name: currentUser.name,
                            joinedAt: new Date().toISOString()
                        }
                    ]
                });
            } catch (error) {
                console.error('Error joining editing session:', error);
            }
        };

        joinSession();

        // Leave session on unmount
        return () => {
            if (!db || !itemId) return;

            const leaveSession = async () => {
                try {
                    const itemRef = doc(db, 'collaborativeItems', itemId.toString());
                    const updatedUsers = editingUsers.filter(user => user.id !== currentUser.uid);

                    await updateDoc(itemRef, {
                        editingUsers: updatedUsers
                    });
                } catch (error) {
                    console.error('Error leaving editing session:', error);
                }
            };

            leaveSession();
        };
    }, [db, itemId, currentUser.uid, isLoading]);

    // Debounced save function
    const saveData = (newData) => {
        if (!db || !itemId) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Update local state immediately for responsiveness
        setData(prevData => ({ ...prevData, ...newData }));

        // Debounce the Firebase update
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                const itemRef = doc(db, 'collaborativeItems', itemId.toString());
                await updateDoc(itemRef, {
                    ...newData,
                    lastModified: serverTimestamp(),
                    lastModifiedBy: currentUser.uid
                });
            } catch (error) {
                console.error('Error saving data:', error);
            }
        }, 1000); // 1 second debounce
    };

    return {
        data,
        editingUsers,
        isLoading,
        lastUpdated,
        saveData,
        otherUsers: editingUsers.filter(user => user.id !== currentUser.uid)
    };
};

// src/components/SimpleCollaborativeEditor.jsx
import React, { useState, useEffect } from 'react';
import { useSimpleCollaboration } from '../hooks/useSimpleCollaboration';
import { useAuth } from '../context/AuthContext';
import CustomIcon from './ui/CustomIcon';

const SimpleCollaborativeEditor = ({ itemId, initialData, onClose }) => {
    const { db, currentUser } = useAuth();
    const { data, editingUsers, isLoading, saveData, otherUsers } = useSimpleCollaboration(
        db,
        itemId,
        currentUser,
        initialData
    );

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        duration: '01:00',
        ...initialData
    });

    // Update form when data changes
    useEffect(() => {
        if (data && Object.keys(data).length > 0) {
            setFormData(prevForm => ({
                ...prevForm,
                ...data
            }));
        }
    }, [data]);

    const handleInputChange = (field, value) => {
        const newFormData = { ...formData, [field]: value };
        setFormData(newFormData);
        saveData(newFormData);
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

    return (
        <div className="space-y-6">
            {/* Header with collaboration indicators */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Edit Story</h2>

                    {/* Show other users editing */}
                    {otherUsers.length > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {otherUsers.slice(0, 3).map(user => (
                                    <div
                                        key={user.id}
                                        className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                                        title={`${user.name} is editing`}
                                    >
                                        {user.name.charAt(0)}
                                    </div>
                                ))}
                                {otherUsers.length > 3 && (
                                    <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                                        +{otherUsers.length - 3}
                                    </div>
                                )}
                            </div>
                            <span className="text-sm text-gray-600">
                                {otherUsers.length === 1
                                    ? `${otherUsers[0].name} is also editing`
                                    : `${otherUsers.length} others are editing`
                                }
                            </span>
                        </div>
                    )}
                </div>

                <button onClick={onClose} className="btn-secondary">
                    <CustomIcon name="cancel" size={40} />
                    <span>Close</span>
                </button>
            </div>

            {/* Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <div className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            value={formData.title || ''}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            className="w-full form-input"
                            placeholder="Enter story title..."
                        />
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Duration
                        </label>
                        <input
                            type="text"
                            value={formData.duration || ''}
                            onChange={(e) => handleInputChange('duration', e.target.value)}
                            className="w-full form-input"
                            placeholder="MM:SS"
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Content
                        </label>
                        <textarea
                            value={formData.content || ''}
                            onChange={(e) => handleInputChange('content', e.target.value)}
                            rows={12}
                            className="w-full form-input"
                            placeholder="Enter story content..."
                        />
                    </div>

                    {/* Status indicator */}
                    <div className="text-xs text-gray-500 flex items-center justify-between">
                        <span>Changes are saved automatically</span>
                        {data.lastModified && (
                            <span>
                                Last updated: {new Date(data.lastModified.seconds * 1000).toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimpleCollaborativeEditor;

// src/components/SimpleStoryEditTab.jsx - Replacement for StoryEditTab
import React from 'react';
import { useAppContext } from '../context/AppContext';
import SimpleCollaborativeEditor from './SimpleCollaborativeEditor';

const SimpleStoryEditTab = ({ itemId }) => {
    const { appState, closeStoryTab } = useAppContext();

    // Find the item in the rundown
    const activeRundown = appState.rundowns.find(r => r.id === appState.activeRundownId);
    const rundownItem = activeRundown?.items?.find(item =>
        item.id.toString() === itemId.toString()
    );

    const handleClose = () => {
        closeStoryTab(itemId);
    };

    if (!rundownItem) {
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
        <SimpleCollaborativeEditor
            itemId={itemId}
            initialData={rundownItem}
            onClose={handleClose}
        />
    );
};

export default SimpleStoryEditTab;