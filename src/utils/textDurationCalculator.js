// src/utils/textDurationCalculator.js
export const calculateReadingTime = (text) => {
    if (!text || typeof text !== 'string') return '00:00';

    // Remove HTML tags and extra whitespace
    const cleanText = text.replace(/<[^>]*>/g, '').trim();

    if (cleanText.length === 0) return '00:00';

    // Average reading speed for TV presenters is about 150-180 words per minute
    // We'll use 160 WPM as a middle ground
    const wordsPerMinute = 160;

    // Split by whitespace and filter out empty strings
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;

    if (wordCount === 0) return '00:00';

    // Calculate total seconds
    const totalMinutes = wordCount / wordsPerMinute;
    const totalSeconds = Math.ceil(totalMinutes * 60);

    // Convert to MM:SS format
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const getWordCount = (text) => {
    if (!text || typeof text !== 'string') return 0;
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    if (cleanText.length === 0) return 0;
    return cleanText.split(/\s+/).filter(word => word.length > 0).length;
};

export const getEstimatedReadingSpeed = (text, actualDuration) => {
    const wordCount = getWordCount(text);
    if (wordCount === 0 || !actualDuration) return 0;

    // Parse duration string (MM:SS) to seconds
    const parts = actualDuration.split(':').map(Number);
    const durationInSeconds = parts.length === 2 ? parts[0] * 60 + parts[1] : 0;

    if (durationInSeconds === 0) return 0;

    // Calculate words per minute
    const wordsPerMinute = (wordCount / durationInSeconds) * 60;
    return Math.round(wordsPerMinute);
};