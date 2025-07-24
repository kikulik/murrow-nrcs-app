// src/utils/folderHelpers.js
// Helper functions for managing story folders

export const generateDateFolder = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const createStoryFolder = (dateFolder, subFolderName) => {
    if (!subFolderName || !subFolderName.trim()) {
        return dateFolder;
    }
    return `${dateFolder}/${subFolderName.trim()}`;
};

export const parseFolderPath = (folderPath) => {
    if (!folderPath) return { dateFolder: generateDateFolder(), subFolder: null };

    const parts = folderPath.split('/');
    return {
        dateFolder: parts[0],
        subFolder: parts[1] || null
    };
};

export const getFoldersByDate = (stories) => {
    const folderMap = new Map();

    stories.forEach(story => {
        if (story.folder) {
            const { dateFolder, subFolder } = parseFolderPath(story.folder);

            if (!folderMap.has(dateFolder)) {
                folderMap.set(dateFolder, new Set());
            }

            if (subFolder) {
                folderMap.get(dateFolder).add(subFolder);
            }
        }
    });

    return folderMap;
};

export const getStoriesInFolder = (stories, folderPath) => {
    return stories.filter(story => story.folder === folderPath);
};

export const sortFoldersByDate = (folders) => {
    return Array.from(folders).sort((a, b) => {
        // Sort date folders in descending order (newest first)
        return new Date(b) - new Date(a);
    });
};

export const validateFolderName = (name) => {
    if (!name || !name.trim()) return false;
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    return !invalidChars.test(name.trim());
};

export const sanitizeFolderName = (name) => {
    if (!name) return '';
    return name.trim().replace(/[<>:"/\\|?*]/g, '_');
};