// src/hooks/useLiveMode.js
// Custom hook for live mode functionality
import { useState, useEffect, useRef } from 'react';
import { calculateTotalDuration } from '../utils/helpers';

export const useLiveMode = (activeRundown, activeRundownId) => {
    const [isLive, setIsLive] = useState(false);
    const [liveTime, setLiveTime] = useState(0);
    const [currentLiveItemIndex, setCurrentLiveItemIndex] = useState(0);
    const [liveRundownId, setLiveRundownId] = useState(null);
    const liveIntervalRef = useRef(null);

    useEffect(() => {
        if (isLive && activeRundown) {
            const remainingItems = activeRundown.items.slice(currentLiveItemIndex);
            setLiveTime(calculateTotalDuration(remainingItems));
            liveIntervalRef.current = setInterval(() => {
                setLiveTime(prevTime => {
                    if (prevTime <= 1) {
                        clearInterval(liveIntervalRef.current);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        } else {
            clearInterval(liveIntervalRef.current);
        }
        return () => clearInterval(liveIntervalRef.current);
    }, [isLive, currentLiveItemIndex, activeRundown]);

    const handleGoLive = () => {
        setIsLive(true);
        setCurrentLiveItemIndex(0);
        setLiveRundownId(activeRundownId);
    };

    const handleEndLive = () => {
        setIsLive(false);
        setLiveRundownId(null);
    };

    const handleNextLiveItem = () => {
        if (activeRundown && currentLiveItemIndex < activeRundown.items.length - 1) {
            setCurrentLiveItemIndex(prev => prev + 1);
        } else {
            handleEndLive();
        }
    };

    return {
        isLive,
        liveTime,
        currentLiveItemIndex,
        liveRundownId,
        handleGoLive,
        handleEndLive,
        handleNextLiveItem
    };
};