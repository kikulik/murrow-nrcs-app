// src/features/rundown/RundownTab.jsx
import React from 'react';
import { Plus, Clock, Trash2, Radio, Printer } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getUserPermissions } from '../../lib/permissions';
import { calculateTotalDuration, formatDuration } from '../../utils/helpers';
import RundownList from './components/RundownList';
import PrintDropdown from './components/PrintDropdown';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const RundownTab = ({ liveMode }) => {
    const { currentUser, db } = useAuth();
    const { appState, setAppState } = useAppContext();
    const userPermissions = getUserPermissions(currentUser.role);

    const currentRundown = appState.rundowns.find(r => r.id === appState.activeRundownId);
    const totalDuration = calculateTotalDuration(currentRundown?.items || []);
    const availableRundowns = appState.rundowns.filter(r => appState.showArchived || !r.archived);
    const isRundownLocked = liveMode.isLive && liveMode.liveRundownId === appState.activeRundownId;

    const handleDeleteRundown = () => {
        if (!currentRundown) return;
        setAppState(prev => ({
            ...prev,
            modal: { type: 'deleteConfirm', id: currentRundown.id, itemType: 'rundowns' }
        }));
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
    };

    const openNewRundown = () => {
        setAppState(prev => ({ ...prev, modal: { type: 'rundownEditor' } }));
    };

    const openAddStoryModal = () => {
        setAppState(prev => ({ ...prev, modal: { type: 'addStoryToRundown' } }));
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
                            className={`bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm ${isRundownLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <option value="">-- Select Rundown --</option>
                            {availableRundowns.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.name} {r.archived ? '(Archived)' : ''}
                                </option>
                            ))}
                        </select>
                        {currentRundown && userPermissions.canDeleteAnything && (
                            <button
                                onClick={() => {/* Handle delete */ }}
                                disabled={isRundownLocked}
                                className={`p-2 text-gray-500 hover:text-red-600 rounded ${isRundownLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Delete Rundown"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={openNewRundown}
                        disabled={isRundownLocked}
                        className={`btn-secondary text-sm ${isRundownLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Plus className="w-4 h-4" />
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
                    />
                    <div className="flex items-center gap-2 text-lg">
                        <Clock className="w-6 h-6" />
                        <span className="font-bold">{formatDuration(totalDuration)}</span>
                    </div>
                    <button
                        onClick={liveMode.handleGoLive}
                        disabled={!currentRundown || currentRundown.archived || !currentRundown.items?.length}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium text-sm rounded-full shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-red-500 disabled:hover:to-red-600"
                    >
                        <Radio className="w-4 h-4" />
                        <span>Go Live</span>
                    </button>
                </div>
            </div>

            {currentRundown && !currentRundown.archived ? (
                <RundownList
                    rundown={currentRundown}
                    isLocked={isRundownLocked}
                    onAddStory={openAddStoryModal}
                    userPermissions={userPermissions}
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
