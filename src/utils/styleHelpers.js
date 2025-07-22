// src/utils/styleHelpers.js
// Style-related helper functions
export const getStatusColor = (status) => {
    switch (status) {
        case 'published':
        case 'Ready for Air':
        case 'Done':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case 'approved':
        case 'in-progress':
        case 'In Progress':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case 'draft':
        case 'Not Ready':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case 'assigned':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

export const getRundownTypeColor = (type) => {
    switch (type) {
        case 'LV':
        case 'STD':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        case 'BRK':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case 'PKG':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case 'VO':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case 'VID':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
        case 'SOT':
            return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300';
        case 'CG':
            return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};