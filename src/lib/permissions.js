// src/lib/permissions.js
// Updated PERMISSIONS constant with role-based workflow
export const PERMISSIONS = {
    Admin: {
        canManageUsers: true,
        canChangeAnyStatus: true,
        canDeleteAnything: true,
        canMoveRundownItems: true,
        canManageTemplates: true,
        canCreateRundownItems: true,
        canCreateAssignments: true,
        canEditAnyStory: true,
        canDeleteStories: true,
        canTakeOverStories: true,
        canCreateRundowns: true
    },
    Producer: {
        canManageUsers: false,
        canChangeAnyStatus: true,
        canDeleteAnything: true,
        canMoveRundownItems: true,
        canManageTemplates: false,
        canCreateRundownItems: true,
        canCreateAssignments: true,
        canEditAnyStory: true,
        canDeleteStories: false, // Only delete rundown items, not stories
        canTakeOverStories: true,
        canCreateRundowns: true
    },
    Editor: {
        canManageUsers: false,
        canChangeAnyStatus: false,
        canDeleteAnything: false,
        canMoveRundownItems: false,
        canManageTemplates: false,
        canCreateRundownItems: false,
        canCreateAssignments: false,
        canEditAnyStory: true,
        canDeleteStories: false,
        canTakeOverStories: false,
        canCreateRundowns: false
    },
    Journalist: {
        canManageUsers: false,
        canChangeAnyStatus: false,
        canDeleteAnything: false,
        canMoveRundownItems: false,
        canManageTemplates: false,
        canCreateRundownItems: false,
        canCreateAssignments: false,
        canEditAnyStory: true,
        canDeleteStories: false,
        canTakeOverStories: false,
        canCreateRundowns: false
    },
    Presenter: {
        canManageUsers: false,
        canChangeAnyStatus: false,
        canDeleteAnything: false,
        canMoveRundownItems: false,
        canManageTemplates: false,
        canCreateRundownItems: false,
        canCreateAssignments: false,
        canEditAnyStory: true,
        canDeleteStories: false,
        canTakeOverStories: false,
        canCreateRundowns: false
    },
};

export const getUserPermissions = (userRole) => {
    return PERMISSIONS[userRole] || PERMISSIONS.Journalist;
};

// Helper function to check if user can edit a specific story
export const canEditStory = (userRole, userId, story) => {
    const permissions = getUserPermissions(userRole);

    // Admin and Producer can edit any story
    if (permissions.canEditAnyStory && (userRole === 'Admin' || userRole === 'Producer')) {
        return true;
    }

    // Other users can edit any story (as per requirements)
    if (permissions.canEditAnyStory) {
        return true;
    }

    // Fallback to own stories only
    return story.authorId === userId;
};

// Helper function to check if user can take over a story being edited
export const canTakeOverStory = (userRole) => {
    const permissions = getUserPermissions(userRole);
    return permissions.canTakeOverStories;
};

// Helper function to determine if user should see warning before editing
export const shouldShowEditWarning = (userRole, editingUser) => {
    // Only show warning if someone else is editing and current user can take over
    return editingUser && canTakeOverStory(userRole);
};
