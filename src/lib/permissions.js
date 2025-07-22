// src/lib/permissions.js
// PERMISSIONS constant and related functions
export const PERMISSIONS = {
    Admin: {
        canManageUsers: true,
        canChangeAnyStatus: true,
        canDeleteAnything: true,
        canMoveRundownItems: true,
        canManageTemplates: true
    },
    Producer: {
        canManageUsers: false,
        canChangeAnyStatus: true,
        canDeleteAnything: true,
        canMoveRundownItems: true,
        canManageTemplates: false
    },
    Editor: {
        canManageUsers: false,
        canChangeAnyStatus: true,
        canDeleteAnything: false,
        canMoveRundownItems: false,
        canManageTemplates: false
    },
    Journalist: {
        canManageUsers: false,
        canChangeAnyStatus: false,
        canDeleteAnything: false,
        canMoveRundownItems: false,
        canManageTemplates: false
    },
    Presenter: {
        canManageUsers: false,
        canChangeAnyStatus: false,
        canDeleteAnything: false,
        canMoveRundownItems: false,
        canManageTemplates: false
    },
};

export const getUserPermissions = (userRole) => {
    return PERMISSIONS[userRole] || PERMISSIONS.Journalist;
};