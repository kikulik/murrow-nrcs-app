// src/features/rundown/RundownTab.jsx
import React, { useState, useEffect } from 'react';
import CustomIcon from '../../components/ui/CustomIcon';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getUserPermissions } from '../../lib/permissions';
import { calculateTotalDuration, formatDuration } from '../../utils/helpers';
import RundownList from './components/RundownList';
import PrintDropdown from './components/PrintDropdown';

const RundownTab = ({ liveMode }) => {
    const { currentUser, db } = useAuth();
    const { appState, setAppState } = useAppContext();
    const [selectedItems, setSelectedItems] = useState([]);
    const [copiedItems, setCopiedItems] = useState([]);

    const userPermissions = getUserPermissions(currentUser.role);

    const currentRundown = appState.rundowns.find(r => r.id === appState.activeRundownId);
    const totalDuration = calculateTotalDuration(currentRundown?.items || []);
    const availableRundowns = appState.rundowns.filter(r => appState.showArchived || !r.archived);
    const isRundownLocked = liveMode.isLive && liveMode.liveRundownId === appState.activeRundownId;

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'c' && selectedItems.length > 0) {
                    e.preventDefault();
                    handleCopyItems();
                } else if (e.key === 'v' && copiedItems.length > 0 && currentRundown) {
                    e.preventDefault();
                    handlePasteItems();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedItems, copiedItems, currentRundown]);

    const formatAirDate = (airDate) => {
        if (!airDate) return 'No air date set';
        const date = new Date(airDate);
        return date.toLocaleString();
    };

    const getAirTime = (airDate) => {
        if (!airDate) return '12:00';
        const date = new Date(airDate);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const handleDeleteRundown = () => {
        if (!currentRundown) return;
        setAppState(prev => ({
            ...prev,
            modal: { type: 'deleteConfirm', id: currentRundown.id, itemType: 'rundowns' }
        }));
    };

    const handleArchiveRundown = async () => {
        if (!currentRundown || !db) return;

        const confirmArchive = confirm(`Are you sure you want to archive "${currentRundown.name}"?`);
        if (!confirmArchive) return;

        try {
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
            const rundownRef = doc(db, "rundowns", currentRundown.id);
            await updateDoc(rundownRef, { archived: true });

            // Clear active rundown if archived
            setAppState(prev => ({ ...prev, activeRundownId: null }));
            setSelectedItems([]);
        } catch (error) {
            console.error("Failed to archive rundown:", error);
            alert("Failed to archive rundown. Please try again.");
        }
    };

    const handleRundownItemUpdate = async (updatedItems) => {
        if (!db || !currentRundown) return;
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
        const rundownRef = doc(db, "rundowns", currentRundown.id);
        try {
            await updateDoc(rundownRef, { items: updatedItems });
        } catch (error) {
            console.error("Failed to update rundown items:", error);
        }
    };

    const handleRundownChange = (e) => {
        const value = e.target.value;
        if (value === '') return;
        setAppState(prev => ({ ...prev, activeRundownId: value }));
        setSelectedItems([]);
    };

    const openNewRundown = () => {
        if (!userPermissions.canCreateRundowns) {
            alert('You do not have permission to create rundowns');
            return;
        }
        setAppState(prev => ({ ...prev, modal: { type: 'rundownEditor' } }));
    };

    const openAddStoryModal = () => {
        if (!userPermissions.canCreateRundownItems) {
            alert('You do not have permission to add rundown items');
            return;
        }
        setAppState(prev => ({ ...prev, modal: { type: 'addStoryToRundown' } }));
    };

    const handleSendSelectedToStories = () => {
        if (selectedItems.length === 0) {
            alert('Please select items to send to stories');
            return;
        }

        const selectedRundownItems = currentRundown.items.filter(item =>
            selectedItems.includes(item.id)
        );

        setAppState(prev => ({
            ...prev,
            modal: {
                type: 'sendMultipleToStories',
                rundownItems: selectedRundownItems
            }
        }));
    };

    const handleCopyItems = () => {
        if (selectedItems.length === 0) return;

        const selectedRundownItems = currentRundown.items.filter(item =>
            selectedItems.includes(item.id)
        );

        setCopiedItems(selectedRundownItems);

        // Also store in localStorage for cross-session persistence
        localStorage.setItem('copiedRundownItems', JSON.stringify(selectedRundownItems));
    };

    const handlePasteItems = async () => {
        let itemsToPaste = copiedItems;

        // If no items in memory, try localStorage
        if (itemsToPaste.length === 0) {
            const storedItems = localStorage.getItem('copiedRundownItems');
            if (storedItems) {
                try {
                    itemsToPaste = JSON.parse(storedItems);
                } catch (error) {
                    console.error('Error parsing stored items:', error);
                    return;
                }
            }
        }

        if (itemsToPaste.length === 0) return;

        try {
            const newItems = itemsToPaste.map(item => ({
                ...item,
                id: Date.now() + Math.random(),
                storyId: null,
                storyStatus: 'Ready for Air'
            }));

            const updatedItems = [...(currentRundown?.items || []), ...newItems];
            await handleRundownItemUpdate(updatedItems);
        } catch (error) {
            console.error('Error pasting items:', error);
        }
    };

    const handleTakeOverItem = async (itemId, previousUserId) => {
        try {
            if (db) {
                const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

                await addDoc(collection(db, "notifications"), {
                    userId: previousUserId,
                    type: 'takeOver',
                    message: `${currentUser.name} has taken over editing the story you were working on.`,
                    itemId: itemId,
                    timestamp: new Date().toISOString(),
                    read: false
                });

                await addDoc(collection(db, "messages"), {
                    userId: 'system',
                    userName: 'System',
                    text: `${currentUser.name} took over editing from another user.`,
                    timestamp: new Date().toISOString(),
                    type: 'system'
                });
            }
        } catch (error) {
            console.error('Error sending take-over notification:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Show Rundown</h2>
                    <div className="flex items-center gap-2">
                        <select
                            value={appState.activeRundownId || ''}
                            onChange={handleRundownChange}
                            disabled={isRundownLocked}
                            className={`bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm ${isRundownLocked ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            <option value="">-- Select Rundown --</option>
                            {availableRundowns.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.name} {r.archived ? '(Archived)' : ''}
                                </option>
                            ))}
                        </select>

                        {/* Archive button */}
                        {currentRundown && !currentRundown.archived && userPermissions.canDeleteAnything && (
                            <button
                                onClick={handleArchiveRundown}
                                disabled={isRundownLocked}
                                className={`p-2 text-gray-500 hover:text-orange-600 rounded ${isRundownLocked ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                title="Archive Rundown"
                            >
                                <CustomIcon name="time" size={20} />
                            </button>
                        )}

                        {/* Delete button */}
                        {currentRundown && userPermissions.canDeleteAnything && (
                            <button
                                onClick={handleDeleteRundown}
                                disabled={isRundownLocked}
                                className={`p-2 text-gray-500 hover:text-red-600 rounded ${isRundownLocked ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                title="Delete Rundown"
                            >
                                <CustomIcon name="delete" size={20} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={openNewRundown}
                        disabled={isRundownLocked || !userPermissions.canCreateRundowns}
                        className={`btn-secondary text-sm ${(isRundownLocked || !userPermissions.canCreateRundowns) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        <CustomIcon name="add story" size={20} />
                        <span>New</span>
                    </button>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={appState.showArchived}
                            onChange={(e) => setAppState(prev => ({ ...prev, showArchived: e.target.checked }))}
                            className="rounded"
                        />
                        Show Archived
                    </label>
                </div>

                <div className="flex items-center gap-4">
                    <PrintDropdown
                        rundown={currentRundown}
                        disabled={!currentRundown || !currentRundown.items?.length}
                        airTime={getAirTime(currentRundown?.airDate)}
                    />
                    <div className="flex items-center gap-2 text-lg">
                        <CustomIcon name="time" size={24} />
                        <span className="font-bold">{formatDuration(totalDuration)}</span>
                    </div>
                    <button
                        onClick={liveMode.handleGoLive}
                        disabled={!currentRundown || currentRundown.archived || !currentRundown.items?.length}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium text-sm rounded-full shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-red-500 disabled:hover:to-red-600"
                    >
                        <CustomIcon name="golive" size={20} />
                        <span>Go Live</span>
                    </button>
                </div>
            </div>

            {currentRundown && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <CustomIcon name="assignments" size={20} />
                                <span>Air Date: {formatAirDate(currentRundown.airDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CustomIcon name="time" size={20} />
                                <span>Created: {new Date(currentRundown.created).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>Air Time: {getAirTime(currentRundown.airDate)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Keyboard shortcut indicators */}
                            {selectedItems.length > 0 && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 mr-4">
                                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+C</kbd>
                                    <span>Copy</span>
                                    {copiedItems.length > 0 && (
                                        <>
                                            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded ml-2">Ctrl+V</kbd>
                                            <span>Paste</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Send to Stories button - only show when items selected */}
                            {selectedItems.length > 0 && (
                                <button
                                    onClick={handleSendSelectedToStories}
                                    className="btn-primary text-sm"
                                >
                                    <CustomIcon name="send" size={16} />
                                    <span>Send to Stories ({selectedItems.length})</span>
                                </button>
                            )}

                            <button
                                onClick={openAddStoryModal}
                                disabled={isRundownLocked || currentRundown.archived || !userPermissions.canCreateRundownItems}
                                className={`btn-primary flex items-center ${(isRundownLocked || currentRundown.archived || !userPermissions.canCreateRundownItems) ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                            >
                                <CustomIcon name="add story" size={20} className="mr-2" />
                                <span>Add Story</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {currentRundown && !currentRundown.archived ? (
                <RundownList
                    rundown={currentRundown}
                    isLocked={isRundownLocked}
                    userPermissions={userPermissions}
                    onItemsUpdate={handleRundownItemUpdate}
                    selectedItems={selectedItems}
                    onSelectionChange={setSelectedItems}
                    onTakeOverItem={handleTakeOverItem}
                />
            ) : (
                <div className="text-center py-12 text-gray-500">
                    {!currentRundown ?
                        'Select a rundown to view items, or create a new one.' :
                        'This rundown is archived. Restore it to make changes.'
                    }
                </div>
            )}
        </div>
    );
};

export default RundownTab;
