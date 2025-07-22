// src/media/MediaManager.js
// Media management utilities
export const generateMediaId = (videoType = 'PKG') => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${videoType}_${timestamp}_${random}`.toUpperCase();
};

export const validateMediaId = (mediaId) => {
    const pattern = /^(PKG|VO|SOT|VID)_[A-Z0-9]+_[A-Z0-9]+$/;
    return pattern.test(mediaId);
};

export const getVideoTypeFromMediaId = (mediaId) => {
    if (!mediaId) return null;
    const parts = mediaId.split('_');
    return parts[0] || null;
};