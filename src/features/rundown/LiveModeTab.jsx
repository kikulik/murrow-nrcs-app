import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, SkipForward, Monitor, Loader, Radio, StopCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatDuration } from '../../utils/helpers';
import { getRundownTypeColor, getStatusColor } from '../../utils/styleHelpers';
import VideoPlayer from '../common/VideoPlayer';

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
    const [queuedItems, setQueuedItems] = useState(new Map());
    const [playingItems, setPlayingItems] = useState(new Map());
    const [channelAssignments, setChannelAssignments] = useState(new Map());
    
    const timecodeInterval = useRef(null);
    const itemStartTime = useRef(0);

    const CASPAR_CHANNEL = 1;
    const LAYER_MAP = { 1: 10, 2: 11, 3: 12, 4: 13 };

    useEffect(() => {
        if (activeRundown?.items) {
            const newAssignments = new Map();
            activeRundown.items.forEach((item, index) => {
                const defaultChannel = (index % 4) + 1;
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

        const virtualChannelId = channelAssignments.get(item.id) || 1;
        const actualLayer = LAYER_MAP[virtualChannelId];
        const clipName = item.highResPath.split('\\').pop().replace('.mp4', '');
        
        try {
            await sendCasparCommand(`LOADBG ${CASPAR_CHANNEL}-${actualLayer} "${clipName}"`);
            
            setQueuedItems(prev => {
                const newQueued = new Map(prev);
                newQueued.set(virtualChannelId, item);
                return newQueued;
            });
            
            console.log(`Queued ${item.title} to Channel ${CASPAR_CHANNEL} Layer ${actualLayer} (Virtual Channel ${virtualChannelId})`);
        } catch (error) {
            console.error('Error queuing item:', error);
        }
    };

    const handlePlayItem = async (virtualChannelId) => {
        const queuedItem = queuedItems.get(virtualChannelId);
        if (!queuedItem) {
            console.warn('No item queued for virtual channel:', virtualChannelId);
            alert(`No item queued for virtual channel ${virtualChannelId}. Please queue an item first.`);
            return;
        }

        const actualLayer = LAYER_MAP[virtualChannelId];

        try {
            await sendCasparCommand(`PLAY ${CASPAR_CHANNEL}-${actualLayer}`);
            
            setPlayingItems(prev => {
                const newPlaying = new Map(prev);
                newPlaying.set(virtualChannelId, queuedItem);
                return newPlaying;
            });
            
            setQueuedItems(prev => {
                const newQueued = new Map(prev);
                newQueued.delete(virtualChannelId);
                return newQueued;
            });
            
            setIsPlaying(true);
            itemStartTime.current = Date.now();
            console.log(`Playing ${queuedItem.title} on Channel ${CASPAR_CHANNEL} Layer ${actualLayer}`);
        } catch (error) {
            console.error('Error playing item:', error);
        }
    };

    const handlePauseChannel = async (virtualChannelId) => {
        const actualLayer = LAYER_MAP[virtualChannelId];
        try {
            await sendCasparCommand(`PAUSE ${CASPAR_CHANNEL}-${actualLayer}`);
            setIsPlaying(false);
        } catch (error) {
            console.error('Error pausing channel:', error);
        }
    };

    const handleStopChannel = async (virtualChannelId) => {
        const actualLayer = LAYER_MAP[virtualChannelId];
        try {
            await sendCasparCommand(`STOP ${CASPAR_CHANNEL}-${actualLayer}`);
            
            setPlayingItems(prev => {
                const newPlaying = new Map(prev);
                newPlaying.delete(virtualChannelId);
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
            liveMode.setCurrentLiveItemIndex(currentIndex + 1);
        }
    };

    const handleChannelChange = (itemId, newVirtualChannelId) => {
        setChannelAssignments(prev => {
            const newAssignments = new Map(prev);
            newAssignments.set(itemId, newVirtualChannelId);
            return newAssignments;
        });
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
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 bg-gray-800 text-white rounded-lg p-4">
                <div className="text-center">
                    <div className="text-2xl font-mono">{currentItemTimecode}</div>
                    <div className="text-xs opacity-75">Current Item</div>
                </div>
                <div className="text-center">
                    <div className="text-xl font-mono">{formatDuration(totalElapsedTime)}</div>
                    <div className="text-xs opacity-75">Total Elapsed</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-mono">{calculateTotalRundownTime()}</div>
                    <div className="text-xs opacity-75">Total Runtime</div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg border p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold">Layer Control</h3>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${casparStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-xs">{casparStatus}</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map(virtualChannelId => {
                            const queuedItem = queuedItems.get(virtualChannelId);
                            const playingItem = playingItems.get(virtualChannelId);
                            const actualLayer = LAYER_MAP[virtualChannelId];
                            
                            return (
                                <div key={virtualChannelId} className="border rounded p-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium">L{actualLayer}</span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handlePlayItem(virtualChannelId)}
                                                disabled={!queuedItem}
                                                className={`p-1 ${!queuedItem ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                                                title="Play"
                                            >
                                                <Play size={12} />
                                            </button>
                                            <button
                                                onClick={() => handlePauseChannel(virtualChannelId)}
                                                disabled={!playingItem}
                                                className={`p-1 ${!playingItem ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                                                title="Pause"
                                            >
                                                <Pause size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleStopChannel(virtualChannelId)}
                                                disabled={!playingItem}
                                                className={`p-1 ${!playingItem ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                                                title="Stop"
                                            >
                                                <Square size={12} />
                                            </button>
                                            <button
                                                onClick={handleNextItem}
                                                className="p-1 hover:bg-gray-100"
                                                title="Next Item"
                                            >
                                                <SkipForward size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="text-xs truncate">
                                        {playingItem && (
                                            <div className="text-green-600 flex items-center gap-1">
                                                <Radio size={8} />
                                                {playingItem.title}
                                            </div>
                                        )}
                                        {queuedItem && !playingItem && (
                                            <div className="text-blue-600 flex items-center gap-1">
                                                <Loader size={8} />
                                                {queuedItem.title}
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
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold">Selected Item</h3>
                        <button
                            onClick={liveMode.handleEndLive}
                            className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                            title="End Live"
                        >
                            <StopCircle size={16} />
                        </button>
                    </div>
                    
                    {selectedItem ? (
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-blue-600 truncate">{selectedItem.title}</div>
                            <div className="flex flex-wrap gap-1">
                                {(Array.isArray(selectedItem.type) ? selectedItem.type : []).map(t => (
                                    <span key={t} className={`px-1 py-0.5 rounded text-xs font-bold ${getRundownTypeColor(t)}`}>
                                        {t}
                                    </span>
                                ))}
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium mb-1">Channel:</label>
                                <select
                                    value={channelAssignments.get(selectedItem.id) || 1}
                                    onChange={(e) => handleChannelChange(selectedItem.id, parseInt(e.target.value))}
                                    className="w-full p-1 border rounded text-xs"
                                >
                                    {[1, 2, 3, 4].map(ch => (
                                        <option key={ch} value={ch}>Ch{ch} (L{LAYER_MAP[ch]})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleQueueItem(selectedItem)}
                                    disabled={!selectedItem.highResPath}
                                    className={`flex-1 text-xs btn-primary p-1 ${!selectedItem.highResPath ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Queue
                                </button>
                                <button
                                    onClick={() => handlePlayItem(channelAssignments.get(selectedItem.id) || 1)}
                                    className="flex-1 text-xs btn-primary p-1"
                                >
                                    Play
                                </button>
                            </div>
                            
                            {!selectedItem.highResPath && (
                                <div className="text-xs text-yellow-600 bg-yellow-50 p-1 rounded">
                                    No video file attached
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">No item selected</p>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border">
                <div className="p-3 border-b flex justify-between items-center">
                    <h3 className="text-sm font-semibold">Rundown Items</h3>
                    <div className="text-xs text-gray-500">{activeRundown.items.length} items</div>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                    {activeRundown.items.map((item, index) => {
                        const isSelected = selectedItemId === item.id;
                        const assignedVirtualChannel = channelAssignments.get(item.id) || 1;
                        const assignedLayer = LAYER_MAP[assignedVirtualChannel];
                        const isQueued = queuedItems.has(assignedVirtualChannel) && queuedItems.get(assignedVirtualChannel).id === item.id;
                        const isPlaying = playingItems.has(assignedVirtualChannel) && playingItems.get(assignedVirtualChannel).id === item.id;
                        
                        return (
                            <div
                                key={item.id}
                                className={`p-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-xs ${
                                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                                onClick={() => handleSelectItem(item)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                            isPlaying ? 'bg-green-500 text-white' :
                                            isQueued ? 'bg-blue-500 text-white' :
                                            isSelected ? 'bg-blue-500 text-white' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{item.title}</div>
                                            <div className="text-gray-500">
                                                {item.duration} | Ch{assignedVirtualChannel} | L{assignedLayer}
                                            </div>
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
                                        
                                        {item.proxyPath && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePreview(item);
                                                }}
                                                className="p-1 text-blue-600 hover:text-blue-800"
                                                title="Preview"
                                            >
                                                <Monitor size={12} />
                                            </button>
                                        )}
                                        
                                        {isPlaying && (
                                            <div className="flex items-center gap-1 text-green-600">
                                                <Radio size={10} />
                                                <span className="text-xs">LIVE</span>
                                            </div>
                                        )}
                                        
                                        {isQueued && !isPlaying && (
                                            <div className="flex items-center gap-1 text-blue-600">
                                                <Loader size={10} />
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

            {showPreview && previewItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-2xl w-full mx-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold">Preview: {previewItem.title}</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <Square size={16} />
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
