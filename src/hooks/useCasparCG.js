// src/hooks/useCasparCG.js
import { useState, useEffect, useCallback } from 'react';

export const useCasparCG = () => {
    const [casparStatus, setCasparStatus] = useState('Disconnected');
    const [channelStates, setChannelStates] = useState({});
    const [isConnected, setIsConnected] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const checkStatus = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/caspar-status`);
            const data = await response.json();

            setCasparStatus(data.status);
            setIsConnected(data.connected);
            setChannelStates(data.channels || {});
        } catch (error) {
            setCasparStatus('Disconnected');
            setIsConnected(false);
            setChannelStates({});
        }
    };

    const sendCommand = useCallback(async (command, options = {}) => {
        try {
            const response = await fetch(`${apiUrl}/api/caspar-command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command, ...options })
            });

            const result = await response.json();

            if (result.success && result.channelState) {
                setChannelStates(prev => ({
                    ...prev,
                    [options.channel]: result.channelState
                }));
            }

            return result;
        } catch (error) {
            console.error('CasparCG command error:', error);
            throw error;
        }
    }, [apiUrl]);

    const queueClip = useCallback(async (channel, clipName, options = {}) => {
        return sendCommand('loadbg', { channel, clip: clipName, ...options });
    }, [sendCommand]);

    const playChannel = useCallback(async (channel) => {
        return sendCommand('play', { channel });
    }, [sendCommand]);

    const pauseChannel = useCallback(async (channel) => {
        return sendCommand('pause', { channel });
    }, [sendCommand]);

    const stopChannel = useCallback(async (channel) => {
        return sendCommand('stop', { channel });
    }, [sendCommand]);

    const clearChannel = useCallback(async (channel) => {
        return sendCommand('clear', { channel });
    }, [sendCommand]);

    const getChannelInfo = useCallback(async (channel) => {
        return sendCommand('info', { channel });
    }, [sendCommand]);

    return {
        casparStatus,
        channelStates,
        isConnected,
        sendCommand,
        queueClip,
        playChannel,
        pauseChannel,
        stopChannel,
        clearChannel,
        getChannelInfo,
        checkStatus
    };
};