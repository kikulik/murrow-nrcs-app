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

    const getVideoUrl = (srcPath) => {
        if (!srcPath) return null;
        const filename = srcPath.split('\\').pop();

        const protocol = window.location.protocol;
        const isSecure = protocol === 'https:';

        if (isSecure) {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://champion-fun-barnacle.ngrok-free.app';
            // --- CHANGE THIS LINE ---
            return `${apiUrl.replace('//', '//').replace('http:', 'https:')}/api/video/${filename}`;
        } else {
            // This part can remain for local http testing if you wish
            return `http://localhost:3001/api/video/${filename}`;
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
