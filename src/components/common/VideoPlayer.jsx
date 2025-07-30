// src/components/common/VideoPlayer.jsx
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

    // IMPORTANT: This assumes PROXY_STORAGE is served by a local web server.
    // For example, if PROXY_STORAGE is "C:\path\to\proxy-storage", you would
    // run a simple web server (like `npx http-server C:\path\to\proxy-storage --cors`)
    // and the URL would be http://your-server-ip:8080/story-id.mp4
    const videoUrl = `http://localhost:8080/${src.split('\\').pop()}`;


    return (
        <video controls src={videoUrl} className="w-full h-full rounded-lg" />
    );
};

export default VideoPlayer;
