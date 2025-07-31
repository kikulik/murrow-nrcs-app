// src/hooks/useLiveMode.js
import { useState, useEffect, useRef } from 'react';
import { calculateTotalDuration } from '../utils/helpers';

export const useLiveMode = (activeRundown, activeRundownId, db) => {
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

    const setActiveRundownInStudio = async (rundownId) => {
        if (!db || !rundownId) {
            console.error('Cannot set active rundown: missing db or rundownId');
            return false;
        }

        try {
            const { doc, setDoc } = await import('firebase/firestore');
            
            const studioSettingsRef = doc(db, 'settings', 'studio');
            await setDoc(studioSettingsRef, {
                queuedRundownId: rundownId,
                isLive: true,
                liveStartedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            
            console.log(`Successfully set active rundown to: ${rundownId}`);
            return true;
        } catch (error) {
            console.error('Error setting active rundown in studio:', error);
            return false;
        }
    };

    const clearActiveRundownInStudio = async () => {
        if (!db) {
            console.error('Cannot clear active rundown: missing db');
            return false;
        }

        try {
            const { doc, setDoc } = await import('firebase/firestore');
            
            const studioSettingsRef = doc(db, 'settings', 'studio');
            await setDoc(studioSettingsRef, {
                isLive: false,
                liveStartedAt: null,
                liveEndedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            
            console.log('Successfully cleared live status');
            return true;
        } catch (error) {
            console.error('Error clearing live status:', error);
            return false;
        }
    };

    const handleGoLive = async () => {
        if (!activeRundownId) {
            console.error('Cannot go live: no active rundown selected');
            return;
        }

        console.log(`Going live with rundown: ${activeRundownId}`);
        
        const success = await setActiveRundownInStudio(activeRundownId);
        
        if (success) {
            setIsLive(true);
            setCurrentLiveItemIndex(0);
            setLiveRundownId(activeRundownId);
            console.log('Live mode activated');
        } else {
            console.error('Failed to activate live mode');
            alert('Failed to activate live mode. Please check your connection and try again.');
        }
    };

    const handleEndLive = async () => {
        console.log('Ending live mode');
        
        await clearActiveRundownInStudio();
        
        setIsLive(false);
        setLiveRundownId(null);
        setCurrentLiveItemIndex(0);
        console.log('Live mode ended');
    };

    const handleNextLiveItem = () => {
        if (activeRundown && currentLiveItemIndex < activeRundown.items.length - 1) {
            setCurrentLiveItemIndex(prev => prev + 1);
            console.log(`Advanced to item ${currentLiveItemIndex + 2} of ${activeRundown.items.length}`);
        } else {
            console.log('Reached end of rundown, ending live mode');
            handleEndLive();
        }
    };

    const handlePreviousLiveItem = () => {
        if (currentLiveItemIndex > 0) {
            setCurrentLiveItemIndex(prev => prev - 1);
            console.log(`Moved back to item ${currentLiveItemIndex} of ${activeRundown.items.length}`);
        }
    };

    return {
        isLive,
        liveTime,
        currentLiveItemIndex,
        liveRundownId,
        handleGoLive,
        handleEndLive,
        handleNextLiveItem,
        handlePreviousLiveItem,
        setCurrentLiveItemIndex
    };
};
