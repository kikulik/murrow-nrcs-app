// src/features/rundown/RundownTab.jsx
import React, { useState, useEffect } from 'react';
import CustomIcon from '../../components/ui/CustomIcon';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getUserPermissions } from '../../lib/permissions';
import { calculateTotalDuration, formatDuration } from '../../utils/helpers';
import RundownList from './components/RundownList';
import PrintDropdown from './components/PrintDropdown';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';

const RundownTab = ({ liveMode }) => {
    const { currentUser, db } = useAuth();
    const { appState, setAppState } = useAppContext();
    const [selectedItems, setSelectedItems] = useState([]);
    const [copiedItems, setCopiedItems] = useState([]);
    const [studioQueue, setStudioQueue] = useState(null);
    const [showStudioModal, setShowStudioModal] = useState(false);
    const [studioModalType, setStudioModalType] = useState(''); // 'busy' or 'confirm'

    const userPermissions = getUserPermissions(currentUser.role);
    const canGoLive = userPermissions.canGoLive;
    const canManageStudio = userPermissions.canCreateRundowns || userPermissions.canManageUsers;

    const currentRundown = appState.rundowns.find(r => r.id === appState.activeRundownId);
    const totalDuration = calculateTotalDuration(currentRundown?.items || []);
    const availableRundowns = appState.rundowns.filter(r => appState.showArchived || !r.archived);
    const isRundownLocked = liveMode.isLive && liveMode.liveRundownId === appState.activeRundownId;

    useEffect(() => {
        checkStudioQueue();
    }, [db]);

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

    const checkStudioQueue = async () => {
        if (!db) return;
        try {
            const studioRef = doc(db, "settings", "studio");
            const studioDoc = await getDoc(studioRef);
            if (studioDoc.exists()) {
                const data = studioDoc.data();
                setStudioQueue(data.queuedRundownId ? {
                    rundownId: data.queuedRundownId,
                    rundownName: data.rundownName,
                    queuedBy: data.queuedBy,
                    queuedAt: data.queuedAt
                } : null);
            }
        } catch (error) {
            console.error("Error checking studio queue:", error);
        }
    };

    const formatAirDate = (airDate) => {
        if (!airDate) return 'No air date set';
        return new Date(airDate).toLocaleString();
    };

    const getAirTime = (airDate) => {
        if (!airDate) return '12:00';
        const date = new Date(airDate);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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

        const confirmArchive = window.confirm(`Are you sure you want to archive "${currentRundown.name}"?`);
        if (!confirmArchive) return;

        try {
            const rundownRef = doc(db, "rundowns", currentRundown.id);
            await updateDoc(rundownRef, { archived: true });

            setAppState(prev => ({ ...prev, activeRundownId: null }));
            setSelectedItems([]);
        } catch (error) {
            console.error("Failed to archive rundown:", error);
            alert("Failed to archive rundown. Please try again.");
        }
    };

    const handleRundownItemUpdate = async (updatedItems) => {
        if (!db || !currentRundown) return;
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
        localStorage.setItem('copiedRundownItems', JSON.stringify(selectedRundownItems));
    };

    const handlePasteItems = async () => {
        let itemsToPaste = copiedItems;

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

    const handleSendToStudio = async () => {
        if (!currentRundown || !canManageStudio) {
            alert("You don't have permission to send rundowns to studio.");
            return;
        }

        if (studioQueue) {
            setStudioModalType('busy');
            setShowStudioModal(true);
            return;
        }

        setStudioModalType('confirm');
        setShowStudioModal(true);
    };

    const confirmSendToStudio = async () => {
        if (!currentRundown || !db) return;

        try {
            const studioRef = doc(db, "settings", "studio");
            await setDoc(studioRef, {
                queuedRundownId: currentRundown.id,
                rundownName: currentRundown.name,
                queuedBy: currentUser.name,
                queuedAt: new Date().toISOString(),
                isLive: false
            }, { merge: true });

            await checkStudioQueue();
            setShowStudioModal(false);
            alert(`"${currentRundown.name}" has been queued for studio playout.`);
        } catch (error) {
            console.error("Failed to send rundown to studio:", error);
            alert("Error: Could not send rundown to studio.");
        }
    };

    const handleRemoveFromStudio = async () => {
        if (!canManageStudio || !studioQueue) return;

        const confirmRemove = window.confirm(`Remove "${studioQueue.rundownName}" from studio queue?`);
        if (!confirmRemove) return;

        try {
            const studioRef = doc(db, "settings", "studio");
            await setDoc(studioRef, {
                queuedRundownId: null,
                rundownName: null,
                queuedBy: null,
                queuedAt: null,
                isLive: false
            });

            setStudioQueue(null);
            alert("Rundown removed from studio queue.");
        } catch (error) {
            console.error("Failed to remove rundown from studio:", error);
            alert("Error: Could not remove rundown from studio.");
        }
    };

    const handleGoLive = async () => {
        if (!studioQueue || !canGoLive) {
            alert('No rundown queued for studio or insufficient permissions');
            return;
        }

        if (studioQueue.rundownId !== currentRundown?.id) {
            alert('You can only go live with the queued rundown');
            return;
        }

        const confirmGoLive = window.confirm(
            `Go live with "${studioQueue.rundownName}"?\n\nThis will start live playout mode.`
        );

        if (confirmGoLive) {
            try {
                const studioRef = doc(db, "settings", "studio");
                await updateDoc(studioRef, { isLive: true });
                
                await liveMode.handleGoLive();
                console.log('Successfully went live with rundown:', studioQueue.rundownName);
            } catch (error) {
                console.error('Error going live:', error);
                alert('Failed to go live. Please try again.');
            }
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
                            className={`bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm ${
                                isRundownLocked ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            <option value="">-- Select Rundown --</option>
                            {availableRundowns.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.name} {r.archived ? '(Archived)' : ''}
                                </option>
                            ))}
                        </select>

                        {currentRundown && !currentRundown.archived && userPermissions.canDeleteAnything && (
                            <button
                                onClick={handleArchiveRundown}
                                disabled={isRundownLocked}
                                className={`p-2 text-gray-500 hover:text-orange-600 rounded ${
                                    isRundownLocked ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title="Archive Rundown"
                            >
                                <CustomIcon name="time" size={40} />
                            </button>
                        )}

                        {currentRundown && userPermissions.canDeleteAnything && (
                            <button
                                onClick={handleDeleteRundown}
                                disabled={isRundownLocked}
                                className={`p-2 text-gray-500 hover:text-red-600 rounded ${
                                    isRundownLocked ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title="Delete Rundown"
                            >
                                <CustomIcon name="delete" size={40} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={openNewRundown}
                        disabled={isRundownLocked || !userPermissions.canCreateRundowns}
                        className={`btn-secondary text-sm ${
                            (isRundownLocked || !userPermissions.canCreateRundowns) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        <CustomIcon name="add story" size={40} />
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
                        <CustomIcon name="time" size={40} />
                        <span className="font-bold">{formatDuration(totalDuration)}</span>
                    </div>
                    
                    {studioQueue && canManageStudio && (
                        <button
                            onClick={handleRemoveFromStudio}
                            className="btn-secondary text-sm bg-orange-600 text-white hover:bg-orange-700"
                            title="Remove from studio queue"
                        >
                            <CustomIcon name="cancel" size={40} />
                            <span>Remove from Studio</span>
                        </button>
                    )}

                    <button
                        onClick={handleSendToStudio}
                        disabled={!currentRundown || isRundownLocked || !canManageStudio}
                        className={`btn-secondary text-sm ${
                            (!currentRundown || isRundownLocked || !canManageStudio) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Send this rundown to the studio queue"
                    >
                        <CustomIcon name="send" size={40} />
                        <span>Send to Studio</span>
                    </button>

                    {studioQueue && studioQueue.rundownId === currentRundown?.id && canGoLive && (
                        <button
                            onClick={handleGoLive}
                            disabled={liveMode.isLive}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium text-sm rounded-full shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Go live with queued rundown"
                        >
                            <CustomIcon name="golive" size={40} />
                            <span>Go Live</span>
                        </button>
                    )}
                </div>
            </div>

            {studioQueue && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CustomIcon name="golive" size={32} className="text-blue-600" />
                            <div>
                                <p className="font-medium text-blue-800 dark:text-blue-200">
                                    Studio Queue: {studioQueue.rundownName}
                                </p>
                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                    Queued by {studioQueue.queuedBy} at {new Date(studioQueue.queuedAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                        {studioQueue.rundownId === currentRundown?.id && (
                            <div className="px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                    Ready for Live
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {currentRundown && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <CustomIcon name="assignments" size={40} />
                                <span>Air Date: {formatAirDate(currentRundown.airDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CustomIcon name="time" size={40} />
                                <span>Created: {new Date(currentRundown.created).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>Air Time: {getAirTime(currentRundown.airDate)}</span>
                            </div>
                            {liveMode.isLive && liveMode.liveRundownId === currentRundown.id && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/20 rounded-full">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-red-600 dark:text-red-400 font-medium">LIVE</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
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

                            {selectedItems.length > 0 && (
                                <button
                                    onClick={handleSendSelectedToStories}
                                    className="btn-primary text-sm"
                                >
                                    <CustomIcon name="send" size={32} />
                                    <span>Send to Stories ({selectedItems.length})</span>
                                </button>
                            )}

                            <button
                                onClick={openAddStoryModal}
                                disabled={isRundownLocked || currentRundown.archived || !userPermissions.canCreateRundownItems}
                                className={`btn-primary flex items-center ${
                                    (isRundownLocked || currentRundown.archived || !userPermissions.canCreateRundownItems) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                <CustomIcon name="add story" size={40} className="mr-2" />
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
                />
            ) : (
                <div className="text-center py-12 text-gray-500">
                    {!currentRundown ?
                        'Select a rundown to view items, or create a new one.' :
                        'This rundown is archived. Restore it to make changes.'
                    }
                </div>
            )}

            {showStudioModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        {studioModalType === 'busy' ? (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <CustomIcon name="notification" size={32} className="text-orange-600" />
                                    <h3 className="text-lg font-semibold">Studio Queue Busy</h3>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Studio queue is currently occupied by: <strong>{studioQueue?.rundownName}</strong>
                                </p>
                                <p className="text-sm text-gray-500 mb-6">
                                    Please remove the current rundown from studio before queuing a new one.
                                </p>
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setShowStudioModal(false)}
                                        className="btn-primary"
                                    >
                                        OK
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <CustomIcon name="send" size={32} className="text-blue-600" />
                                    <h3 className="text-lg font-semibold">Send to Studio</h3>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Queue "<strong>{currentRundown?.name}</strong>" for studio playout?
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowStudioModal(false)}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmSendToStudio}
                                        className="btn-primary"
                                    >
                                        Send to Studio
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RundownTab;
