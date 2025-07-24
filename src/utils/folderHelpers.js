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
        canDeleteStories: false,
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

export const canEditStory = (userRole, userId, story) => {
    const permissions = getUserPermissions(userRole);

    if (permissions.canEditAnyStory && (userRole === 'Admin' || userRole === 'Producer')) {
        return true;
    }

    if (permissions.canEditAnyStory) {
        return true;
    }

    return story.authorId === userId;
};

export const canTakeOverStory = (userRole) => {
    const permissions = getUserPermissions(userRole);
    return permissions.canTakeOverStories;
};

export const shouldShowEditWarning = (userRole, editingUser) => {
    return editingUser && canTakeOverStory(userRole);
};
