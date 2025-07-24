// src/features/rundown/LiveModeTab.jsx
import React from 'react';
import CustomIcon from '../../components/ui/CustomIcon';
import { useAppContext } from '../../context/AppContext';
import { formatDuration } from '../../utils/helpers';
import { getRundownTypeColor, getStatusColor } from '../../utils/styleHelpers';

const LiveModeTab = ({ liveMode }) => {
    const { appState } = useAppContext();
    const activeRundown = appState.rundowns.find(r => r.id === appState.activeRundownId);

    if (!activeRundown) return null;

    const currentItem = activeRundown.items[liveMode.currentLiveItemIndex];

    return (
        <div className="space-y-8">
            <div className="text-center p-8 bg-gray-800 text-white rounded-lg shadow-2xl">
                <h2 className="text-2xl font-bold mb-4">LIVE MODE</h2>
                <div className="text-7xl font-mono tracking-widest">
                    {formatDuration(liveMode.liveTime)}
                </div>
                <p className="text-xl mt-2">Remaining Time</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-2">Now On Air:</h3>
                <div className="text-2xl font-bold text-blue-500">
                    {currentItem?.title || "End of Show"}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                        <h3 className="text-lg font-semibold mb-2">Up Next:</h3>
                        <p className="text-xl">
                            {activeRundown.items[liveMode.currentLiveItemIndex + 1]?.title || "End of Show"}
                        </p>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                        <button onClick={liveMode.handleNextLiveItem} className="btn-primary text-lg px-8 py-4 w-full">
                            Next Item <CustomIcon name="nextitem" size={36} />
                        </button>
                        <button onClick={liveMode.handleEndLive} className="btn-secondary bg-red-600 text-white hover:bg-red-700 w-full text-lg px-8 py-4">
                            End Live
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-semibold">Full Rundown</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {activeRundown.items.map((item, index) => (
                            <div key={item.id} className={`p-3 border-b last:border-b-0 ${index === liveMode.currentLiveItemIndex ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <div className="font-medium text-sm">{index + 1}. {item.title}</div>
                                    <div className="text-xs text-gray-500">{item.duration}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveModeTab;
