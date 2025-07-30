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

    const setActiveRundownInFirestore = async (rundownId) => {
        if (!db || !rundownId) {
            console.error('Cannot set active rundown: missing db or rundownId');
            return false;
        }

        try {
            const { doc, setDoc } = await import('firebase/firestore');
            
            // Set the active rundown in the settings collection for your backend service
            const activeSettingsRef = doc(db, 'settings', 'active');
            await setDoc(activeSettingsRef, {
                activeRundownId: rundownId,
                lastUpdated: new Date().toISOString(),
                isLive: true
            }, { merge: true });
            
            console.log(`Successfully set active rundown to: ${rundownId}`);
            return true;
        } catch (error) {
            console.error('Error setting active rundown in Firestore:', error);
            return false;
        }
    };

    const clearActiveRundownInFirestore = async () => {
        if (!db) {
            console.error('Cannot clear active rundown: missing db');
            return false;
        }

        try {
            const { doc, setDoc } = await import('firebase/firestore');
            
            // Clear the active rundown in the settings collection
            const activeSettingsRef = doc(db, 'settings', 'active');
            await setDoc(activeSettingsRef, {
                activeRundownId: null,
                lastUpdated: new Date().toISOString(),
                isLive: false
            }, { merge: true });
            
            console.log('Successfully cleared active rundown');
            return true;
        } catch (error) {
            console.error('Error clearing active rundown in Firestore:', error);
            return false;
        }
    };

    const handleGoLive = async () => {
        if (!activeRundownId) {
            console.error('Cannot go live: no active rundown selected');
            return;
        }

        console.log(`Going live with rundown: ${activeRundownId}`);
        
        // Set the rundown as active in Firestore for CasparCG sync
        const success = await setActiveRundownInFirestore(activeRundownId);
        
        if (success) {
            setIsLive(true);
            setCurrentLiveItemIndex(0);
            setLiveRundownId(activeRundownId);
            console.log('Live mode activated and rundown synced to CasparCG');
        } else {
            console.error('Failed to activate live mode - could not sync to CasparCG');
            alert('Failed to activate live mode. Please check your connection and try again.');
        }
    };

    const handleEndLive = async () => {
        console.log('Ending live mode');
        
        // Clear the active rundown in Firestore
        await clearActiveRundownInFirestore();
        
        setIsLive(false);
        setLiveRundownId(null);
        console.log('Live mode ended and rundown cleared from CasparCG');
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
