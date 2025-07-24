export function generateDateFolder(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function createStoryFolder(dateFolder, subFolderName) {
    if (!subFolderName || !subFolderName.trim()) {
        return dateFolder;
    }
    return `${dateFolder}/${subFolderName.trim()}`;
}

export function parseFolderPath(folderPath) {
    if (!folderPath) return { dateFolder: generateDateFolder(), subFolder: null };

    const parts = folderPath.split('/');
    return {
        dateFolder: parts[0],
        subFolder: parts[1] || null
    };
}

export function getFoldersByDate(stories) {
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
}

export function getStoriesInFolder(stories, folderPath) {
    return stories.filter(story => story.folder === folderPath);
}

export function sortFoldersByDate(folders) {
    return Array.from(folders).sort((a, b) => {
        return new Date(b) - new Date(a);
    });
}

export function validateFolderName(name) {
    if (!name || !name.trim()) return false;
    const invalidChars = /[<>:"/\\|?*]/;
    return !invalidChars.test(name.trim());
}

export function sanitizeFolderName(name) {
    if (!name) return '';
    return name.trim().replace(/[<>:"/\\|?*]/g, '_');
}

export function getPersistedFolders() {
    try {
        const stored = localStorage.getItem('murrow_created_folders');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error reading persisted folders:', error);
        return [];
    }
}

export function persistFolder(folderPath) {
    try {
        const existing = getPersistedFolders();
        const updated = [...new Set([...existing, folderPath])];
        localStorage.setItem('murrow_created_folders', JSON.stringify(updated));
        return updated;
    } catch (error) {
        console.error('Error persisting folder:', error);
        return [];
    }
}

export function removePersistedFolder(folderPath) {
    try {
        const existing = getPersistedFolders();
        const updated = existing.filter(folder => folder !== folderPath);
        localStorage.setItem('murrow_created_folders', JSON.stringify(updated));
        return updated;
    } catch (error) {
        console.error('Error removing persisted folder:', error);
        return [];
    }
}
