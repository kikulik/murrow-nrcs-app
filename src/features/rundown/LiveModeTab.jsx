// src/features/rundown/LiveModeTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import CustomIcon from '../../components/ui/CustomIcon';
import { useAppContext } from '../../context/AppContext';
import { formatDuration } from '../../utils/helpers';
import { getRundownTypeColor, getStatusColor } from '../../utils/styleHelpers';
import VideoPlayer from '../../components/common/VideoPlayer';

const LiveModeTab = ({ liveMode }) => {
    const { appState } = useAppContext();
    const activeRundown = appState.rundowns.find(r => r.id === appState.activeRundownId);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [currentItemTimecode, setCurrentItemTimecode] = useState('00:00:00');
    const [totalElapsedTime, setTotalElapsedTime] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [previewItem, setPreviewItem] = useState(null);
    const [casparStatus, setCasparStatus] = useState('Disconnected');
    
    const timecodeInterval = useRef(null);
    const itemStartTime = useRef(0);

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
            const response = await fetch('http://192.168.15.61:3001/api/caspar-command', {
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

    const handlePlay = async () => {
        const currentItem = activeRundown?.items[liveMode.currentLiveItemIndex];
        if (!currentItem) return;

        if (currentItem.highResPath) {
            const clipName = currentItem.highResPath.split('\\').pop().replace('.mp4', '');
            await sendCasparCommand(`PLAY 1-10 "${clipName}"`);
        }
        
        setIsPlaying(true);
        itemStartTime.current = Date.now();
    };

    const handlePause = async () => {
        await sendCasparCommand('PAUSE 1-10');
        setIsPlaying(false);
    };

    const handleStop = async () => {
        await sendCasparCommand('STOP 1-10');
        setIsPlaying(false);
        setCurrentItemTimecode('00:00:00');
        itemStartTime.current = 0;
    };

    const handleLoop = async () => {
        const newLoopState = !isLooping;
        setIsLooping(newLoopState);
        
        if (newLoopState) {
            await sendCasparCommand('CALL 1-10 LOOP 1');
        } else {
            await sendCasparCommand('CALL 1-10 LOOP 0');
        }
    };

    const handleItemSelect = async (itemIndex) => {
        const item = activeRundown?.items[itemIndex];
        if (!item || !item.highResPath) return;

        await handleStop();
        liveMode.setCurrentLiveItemIndex(itemIndex);
        
        const clipName = item.highResPath.split('\\').pop().replace('.mp4', '');
        await sendCasparCommand(`LOADBG 1-10 "${clipName}" AUTO`);
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

    const currentItem = activeRundown?.items[liveMode.currentLiveItemIndex];

    if (!activeRundown) return null;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-semibold mb-4">Now On Air:</h3>
                    <div className="text-2xl font-bold text-blue-500 mb-2">
                        {currentItem?.title || "End of Show"}
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        {(Array.isArray(currentItem?.type) ? currentItem.type : []).map(t => (
                            <span key={t} className={`px-2 py-1 rounded text-xs font-bold ${getRundownTypeColor(t)}`}>
                                {t}
                            </span>
                        ))}
                    </div>
                    
                    {currentItem?.content && (
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm max-h-32 overflow-y-auto">
                            {currentItem.content}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Playout Controls</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <button
                        onClick={handlePlay}
                        disabled={!currentItem?.highResPath}
                        className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                        <CustomIcon name="golive" size={32} />
                        <span>Play</span>
                    </button>

                    <button
                        onClick={handlePause}
                        disabled={!isPlaying}
                        className="btn-primary bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                    >
                        <CustomIcon name="time" size={32} />
                        <span>Pause</span>
                    </button>

                    <button
                        onClick={handleStop}
                        className="btn-primary bg-red-600 hover:bg-red-700"
                    >
                        <CustomIcon name="cancel" size={32} />
                        <span>Stop</span>
                    </button>

                    <button
                        onClick={handleLoop}
                        className={`btn-primary ${isLooping ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                    >
                        <CustomIcon name="stories" size={32} />
                        <span>Loop</span>
                    </button>

                    <button
                        onClick={liveMode.handleNextLiveItem}
                        disabled={liveMode.currentLiveItemIndex >= activeRundown.items.length - 1}
                        className="btn-primary disabled:opacity-50"
                    >
                        <CustomIcon name="nextitem" size={32} />
                        <span>Next</span>
                    </button>

                    <button
                        onClick={liveMode.handleEndLive}
                        className="btn-secondary bg-red-600 text-white hover:bg-red-700"
                    >
                        <CustomIcon name="logout" size={32} />
                        <span>End Live</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Full Rundown</h3>
                    <div className="text-sm text-gray-500">
                        Item {liveMode.currentLiveItemIndex + 1} of {activeRundown.items.length}
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {activeRundown.items.map((item, index) => (
                        <div
                            key={item.id}
                            className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                index === liveMode.currentLiveItemIndex ?
                                'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                index < liveMode.currentLiveItemIndex ? 'opacity-50' : ''
                            }`}
                            onClick={() => handleItemSelect(index)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                        index === liveMode.currentLiveItemIndex ?
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
                                            <CustomIcon name="stories" size={32} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showPreview && previewItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Preview: {previewItem.title}</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <CustomIcon name="cancel" size={32} />
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
