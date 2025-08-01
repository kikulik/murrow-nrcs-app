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

    // Fix for mixed content error - use environment variable or detect protocol
    const getVideoUrl = (srcPath) => {
        if (!srcPath) return null;
        
        const filename = srcPath.split('\\').pop();
        
        // Check if we have a custom video server URL from environment
        const videoServerUrl = import.meta.env.VITE_VIDEO_SERVER_URL;
        
        if (videoServerUrl) {
            return `${videoServerUrl}/${filename}`;
        }
        
        // Detect current protocol and use appropriate local server
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        // For development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Use same protocol as the current page
            const port = protocol === 'https:' ? '8443' : '8080';
            return `${protocol}//${hostname}:${port}/${filename}`;
        }
        
        // For production, try to serve from the same domain
        // You might need to adjust this based on your deployment setup
        return `/api/video/${filename}`;
    };

    const videoUrl = getVideoUrl(src);

    if (!videoUrl) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500">Video URL not available</p>
            </div>
        );
    }

    return (
        <video 
            controls 
            src={videoUrl} 
            className="w-full h-full rounded-lg"
            onError={(e) => {
                console.error('Video load error:', e.target.error);
                console.log('Failed video URL:', videoUrl);
            }}
        />
    );
};

export default VideoPlayer;
