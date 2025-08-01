import React from 'react';

const VideoPlayer = ({ src, status }) => {
    if (!src && status !== 'Processing') {
        return (
            <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500">No Video Attached</p>
            </div>
        );
    }

    if (status === 'Processing') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-sm text-blue-500">Processing Video...</p>
            </div>
        );
    }

    if (status === 'Error') {
        return (
            <div className="flex items-center justify-center h-full bg-red-100 dark:bg-red-900/50 rounded-lg">
                <p className="text-sm text-red-600">Video Processing Failed</p>
            </div>
        );
    }

    // SIMPLE FIX: Just change the protocol to match the current page
    // Keep all the original logic but use HTTPS when the page is HTTPS
    const getVideoUrl = (srcPath) => {
        if (!srcPath) return null;
        
        const filename = srcPath.split('\\').pop();
        
        // Use the current page's protocol instead of hardcoded http://
        const protocol = window.location.protocol;
        const isSecure = protocol === 'https:';
        
        // If we're on HTTPS, use your ngrok URL, otherwise use localhost
        if (isSecure) {
            // Use your ngrok URL or environment variable
            const apiUrl = import.meta.env.VITE_API_URL || 'https://champion-fun-barnacle.ngrok-free.app';
            return `${apiUrl.replace('//', '//').replace('http:', 'https:')}/proxy/${filename}`;
        } else {
            // Original localhost logic for local development
            return `http://localhost:8080/${filename}`;
        }
    };

    const videoUrl = getVideoUrl(src);

    return (
        <video 
            controls 
            src={videoUrl} 
            className="w-full h-full rounded-lg"
            onError={(e) => {
                console.error('Video load error:', e.target.error);
                console.log('Attempted video URL:', videoUrl);
                console.log('Original src path:', src);
            }}
        />
    );
};

export default VideoPlayer;
