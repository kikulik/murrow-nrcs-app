// src/features/rundown/LiveModeTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, SkipForward, Monitor, Loader, Radio } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatDuration } from '../../utils/helpers';
import { getRundownTypeColor, getStatusColor } from '../../utils/styleHelpers';
import VideoPlayer from '../../components/common/VideoPlayer';

const LiveModeTab = ({ liveMode }) => {
    const { appState } = useAppContext();
    const activeRundown = appState.rundowns.find(r => r.id === appState.activeRundownId);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentItemTimecode, setCurrentItemTimecode] = useState('00:00:00');
    const [totalElapsedTime, setTotalElapsedTime] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [previewItem, setPreviewItem] = useState(null);
    const [casparStatus, setCasparStatus] = useState('Disconnected');
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [queuedItems, setQueuedItems] = useState(new Map()); // channelId -> item
    const [playingItems, setPlayingItems] = useState(new Map()); // channelId -> item
    const [channelAssignments, setChannelAssignments] = useState(new Map()); // itemId -> channelId
    
    const timecodeInterval = useRef(null);
    const itemStartTime = useRef(0);

    // Initialize default A-B roll channel assignments
    useEffect(() => {
        if (activeRundown?.items) {
            const newAssignments = new Map();
            activeRundown.items.forEach((item, index) => {
                const defaultChannel = (index % 2) + 1; // A-B roll: 1,2,1,2...
                newAssignments.set(item.id, defaultChannel);
            });
            setChannelAssignments(newAssignments);
        }
    }, [activeRundown?.items]);

    useEffect(() => {
        if (isPlaying) {
            timecodeInterval.current = setInterval(() => {
                const elapsed = Date.now() - itemStartTime.current;
                const seconds = Math.floor(elapsed / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                
                setCurrentItemTimecode(
                    `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
                );
                setTotalElapsedTime(seconds);
            }, 1000);
        } else {
            clearInterval(timecodeInterval.current);
        }

        return () => clearInterval(timecodeInterval.current);
    }, [isPlaying]);

    const sendCasparCommand = async (command) => {
        try {
            const apiUrl = `${import.meta.env.VITE_API_URL}/api/caspar-command`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            });
            
            if (response.ok) {
                const result = await response.json();
                setCasparStatus('Connected');
                return result;
            } else {
                setCasparStatus('Error');
                console.error('CasparCG command failed:', command);
            }
        } catch (error) {
            setCasparStatus('Disconnected');
            console.error('CasparCG connection error:', error);
        }
    };

    const handleSelectItem = (item) => {
        setSelectedItemId(item.id);
        console.log(`Selected item: ${item.title}`);
    };

    const handleQueueItem = async (item) => {
        if (!item.highResPath) {
            console.warn('No video path available for item:', item.title);
            return;
        }

        const channelId = channelAssignments.get(item.id) || 1;
        const clipName = item.highResPath.split('\\').pop().replace('.mp4', '');
        
        try {
            await sendCasparCommand(`LOADBG ${channelId}-10 "${clipName}"`);
            setQueuedItems(prev => new Map(prev.set(channelId, item)));
            console.log(`Queued ${item.title} to channel ${channelId}`);
        } catch (error) {
            console.error('Error queuing item:', error);
        }
    };

    const handlePlayItem = async (channelId) => {
        const queuedItem = queuedItems.get(channelId);
        if (!queuedItem) {
            console.warn('No item queued for channel:', channelId);
            return;
        }

        try {
            await sendCasparCommand(`PLAY ${channelId}-10`);
            setPlayingItems(prev => new Map(prev.set(channelId, queuedItem)));
            setQueuedItems(prev => {
                const newQueued = new Map(prev);
                newQueued.delete(channelId);
                return newQueued;
            });
            setIsPlaying(true);
            itemStartTime.current = Date.now();
            console.log(`Playing ${queuedItem.title} on channel ${channelId}`);
        } catch (error) {
            console.error('Error playing item:', error);
        }
    };

    const handlePauseChannel = async (channelId) => {
        try {
            await sendCasparCommand(`PAUSE ${channelId}-10`);
            setIsPlaying(false);
        } catch (error) {
            console.error('Error pausing channel:', error);
        }
    };

    const handleStopChannel = async (channelId) => {
        try {
            await sendCasparCommand(`STOP ${channelId}-10`);
            setPlayingItems(prev => {
                const newPlaying = new Map(prev);
                newPlaying.delete(channelId);
                return newPlaying;
            });
            setIsPlaying(false);
            setCurrentItemTimecode('00:00:00');
            itemStartTime.current = 0;
        } catch (error) {
            console.error('Error stopping channel:', error);
        }
    };

    const handleNextItem = () => {
        const currentIndex = liveMode.currentLiveItemIndex;
        if (currentIndex < activeRundown.items.length - 1) {
            const nextItem = activeRundown.items[currentIndex + 1];
            handleSelectItem(nextItem);
            handleQueueItem(nextItem);
            liveMode.setCurrentLiveItemIndex(currentIndex + 1);
        }
    };

    const handleChannelChange = (itemId, newChannelId) => {
        setChannelAssignments(prev => new Map(prev.set(itemId, newChannelId)));
    };

    const handlePreview = (item) => {
        setPreviewItem(item);
        setShowPreview(true);
    };

    const calculateTotalRundownTime = () => {
        if (!activeRundown?.items) return '00:00:00';
        
        let totalSeconds = 0;
        activeRundown.items.forEach(item => {
            const duration = item.duration || '00:00';
            const parts = duration.split(':').map(Number);
            if (parts.length === 2) {
                totalSeconds += parts[0] * 60 + parts[1];
            }
        });
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const selectedItem = selectedItemId ? activeRundown?.items.find(item => item.id === selectedItemId) : null;

    if (!activeRundown) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status Panel */}
                <div className="bg-gray-800 text-white rounded-lg shadow-2xl p-6">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold mb-2">LIVE MODE</h2>
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <div className={`w-3 h-3 rounded-full ${casparStatus === 'Connected' ? 'bg-green-500' : casparStatus === 'Error' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                            <span className="text-sm">CasparCG: {casparStatus}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="text-4xl font-mono tracking-widest mb-2">
                                {currentItemTimecode}
                            </div>
                            <p className="text-sm opacity-75">Current Item Timecode</p>
                        </div>

                        <div className="text-center">
                            <div className="text-2xl font-mono tracking-widest mb-2">
                                {formatDuration(totalElapsedTime)}
                            </div>
                            <p className="text-sm opacity-75">Total Elapsed Time</p>
                        </div>

                        <div className="text-center">
                            <div className="text-xl font-mono tracking-widest mb-2">
                                {calculateTotalRundownTime()}
                            </div>
                            <p className="text-sm opacity-75">Total Rundown Time</p>
                        </div>
                    </div>
                </div>

                {/* Channel Control Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-semibold mb-4">Channel Control</h3>
                    
                    {[1, 2, 3, 4].map(channelId => {
                        const queuedItem = queuedItems.get(channelId);
                        const playingItem = playingItems.get(channelId);
                        
                        return (
                            <div key={channelId} className="mb-4 p-3 border rounded">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium">Channel {channelId}</h4>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handlePlayItem(channelId)}
                                            disabled={!queuedItem}
                                            className="p-2 btn-secondary disabled:opacity-50"
                                            title="Play"
                                        >
                                            <Play size={16} />
                                        </button>
                                        <button
                                            onClick={() => handlePauseChannel(channelId)}
                                            disabled={!playingItem}
                                            className="p-2 btn-secondary disabled:opacity-50"
                                            title="Pause"
                                        >
                                            <Pause size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleStopChannel(channelId)}
                                            disabled={!playingItem}
                                            className="p-2 btn-secondary disabled:opacity-50"
                                            title="Stop"
                                        >
                                            <Square size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="text-sm">
                                    {playingItem && (
                                        <div className="text-green-600 flex items-center gap-1">
                                            <Radio size={12} />
                                            Playing: {playingItem.title}
                                        </div>
                                    )}
                                    {queuedItem && (
                                        <div className="text-blue-600 flex items-center gap-1">
                                            <Loader size={12} />
                                            Queued: {queuedItem.title}
                                        </div>
                                    )}
                                    {!playingItem && !queuedItem && (
                                        <div className="text-gray-500">Empty</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Selected Item Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-semibold mb-4">Selected Item</h3>
                    
                    {selectedItem ? (
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-blue-600">{selectedItem.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    {(Array.isArray(selectedItem.type) ? selectedItem.type : []).map(t => (
                                        <span key={t} className={`px-2 py-1 rounded text-xs font-bold ${getRundownTypeColor(t)}`}>
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1">Assign to Channel:</label>
                                <select
                                    value={channelAssignments.get(selectedItem.id) || 1}
                                    onChange={(e) => handleChannelChange(selectedItem.id, parseInt(e.target.value))}
                                    className="w-full p-2 border rounded"
                                >
                                    {[1, 2, 3, 4].map(ch => (
                                        <option key={ch} value={ch}>Channel {ch}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleQueueItem(selectedItem)}
                                    disabled={!selectedItem.highResPath}
                                    className="flex-1 btn-primary disabled:opacity-50"
                                >
                                    <Loader size={20} />
                                    Queue
                                </button>
                                <button
                                    onClick={() => handlePlayItem(channelAssignments.get(selectedItem.id) || 1)}
                                    className="flex-1 btn-primary"
                                >
                                    <Play size={20} />
                                    Play
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500">No item selected</p>
                    )}
                </div>
            </div>

            {/* Transport Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Transport Controls</h3>
                <div className="flex gap-3">
                    <button
                        onClick={handleNextItem}
                        disabled={liveMode.currentLiveItemIndex >= activeRundown.items.length - 1}
                        className="btn-primary disabled:opacity-50"
                    >
                        <SkipForward size={64} />
                        <span>Next Item</span>
                    </button>

                    <button
                        onClick={liveMode.handleEndLive}
                        className="btn-secondary bg-red-600 text-white hover:bg-red-700"
                    >
                        <Square size={64} />
                        <span>End Live</span>
                    </button>
                </div>
            </div>

            {/* Rundown Items List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Rundown Items</h3>
                    <div className="text-sm text-gray-500">
                        {activeRundown.items.length} items
                    </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                    {activeRundown.items.map((item, index) => {
                        const isSelected = selectedItemId === item.id;
                        const assignedChannel = channelAssignments.get(item.id) || 1;
                        const isQueued = queuedItems.has(assignedChannel) && queuedItems.get(assignedChannel).id === item.id;
                        const isPlaying = playingItems.has(assignedChannel) && playingItems.get(assignedChannel).id === item.id;
                        
                        return (
                            <div
                                key={item.id}
                                className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
                                }`}
                                onClick={() => handleSelectItem(item)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                            isPlaying ? 'bg-green-500 text-white' :
                                            isQueued ? 'bg-blue-500 text-white' :
                                            isSelected ? 'bg-blue-500 text-white' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{item.title}</div>
                                            <div className="text-xs text-gray-500">
                                                Duration: {item.duration} | Channel: {assignedChannel}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
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
                                        
                                        {item.proxyPath && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePreview(item);
                                                }}
                                                className="p-1 text-blue-600 hover:text-blue-800"
                                                title="Preview"
                                            >
                                                <Monitor size={16} />
                                            </button>
                                        )}
                                        
                                        {isPlaying && (
                                            <div className="flex items-center gap-1 text-green-600">
                                                <Radio size={12} />
                                                <span className="text-xs">LIVE</span>
                                            </div>
                                        )}
                                        
                                        {isQueued && !isPlaying && (
                                            <div className="flex items-center gap-1 text-blue-600">
                                                <Loader size={12} />
                                                <span className="text-xs">QUEUED</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && previewItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Preview: {previewItem.title}</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <Square size={24} />
                            </button>
                        </div>
                        <div className="aspect-video">
                            <VideoPlayer src={previewItem.proxyPath} status="Ready" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveModeTab;
