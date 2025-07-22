// src/utils/helpers.js
// Helper functions
export const parseDuration = (durationStr) => {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
};

export const formatDuration = (totalSeconds) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const calculateTotalDuration = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((total, item) => total + parseDuration(item.duration), 0);
};

export const nameToUsername = (name) => {
    if (!name) return '';
    const parts = name.toLowerCase().split(' ');
    if (parts.length < 2) return parts[0];
    return `${parts[0].charAt(0)}.${parts[parts.length - 1]}`;
};