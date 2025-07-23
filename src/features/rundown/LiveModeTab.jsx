// src/features/rundown/LiveModeTab.jsx
// Live broadcast mode interface
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
    const currentStory = currentItem?.storyId ?
        appState.stories.find(s => s.id === currentItem.storyId) : null;

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
                <div className="flex items-center gap-2 mt-2">
                    {(Array.isArray(currentItem?.type) ? currentItem.type : []).map(t => (
                        <span key={t} className={`px-2 py-1 rounded text-xs font-bold ${getRundownTypeColor(t)}`}>
                            {t}
                        </span>
                    ))}
                </div>
            </div>

            {currentStory?.videoUrl && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-semibold mb-4">Current Video</h3>
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center h-64">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            <CustomIcon name="golive" size={80} className="mx-auto mb-2 opacity-50" />
                            <p>Video Player Component</p>
                            <p className="text-sm">Would show: {currentStory.title}</p>
                        </div>
                    </div>
                </div>
            )}

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
                            Next Item <CustomIcon name="close" size={36} />
                        </button>
                        <button
                            onClick={liveMode.handleEndLive}
                            className="btn-secondary bg-red-600 text-white hover:bg-red-700 w-full text-lg px-8 py-4"
                        >
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
                            <div
                                key={item.id}
                                className={`p-3 border-b last:border-b-0 ${index === liveMode.currentLiveItemIndex ?
                                    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                    index < liveMode.currentLiveItemIndex ? 'opacity-50' : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${index === liveMode.currentLiveItemIndex ?
                                            'bg-red-500 text-white' :
                                            index < liveMode.currentLiveItemIndex ?
                                                'bg-gray-300 text-gray-600' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{item.title}</div>
                                            <div className="text-xs text-gray-500">Duration: {item.duration}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {(Array.isArray(item.type) ? item.type : [item.type]).map(t => (
                                            <span key={t} className={`px-1 py-0.5 rounded text-xs font-bold ${getRundownTypeColor(t)}`}>
                                                {t}
                                            </span>
                                        ))}
                                        {item.storyStatus && (
                                            <span className={`px-1 py-0.5 rounded text-xs font-medium ${getStatusColor(item.storyStatus)}`}>
                                                {item.storyStatus}
                                            </span>
                                        )}
                                    </div>
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
