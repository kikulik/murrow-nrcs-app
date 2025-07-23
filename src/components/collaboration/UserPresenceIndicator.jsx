// src/components/collaboration/UserPresenceIndicator.jsx
import React from 'react';
import CustomIcon from '../ui/CustomIcon';
import { useCollaboration } from '../../context/CollaborationContext';

const UserPresenceIndicator = ({ itemId, className = '' }) => {
    const { getUserEditingItem } = useCollaboration();

    const editingUser = getUserEditingItem(itemId);

    if (!editingUser) return null;

    return (
        <div className={`flex items-center space-x-1 ${className}`}>
            <div className="relative">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    {editingUser.userName.charAt(0)}
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <span className="text-xs text-blue-600 font-medium">
                {editingUser.userName} is editing
            </span>
        </div>
    );
};

export const ActiveUsersPanel = () => {
    const { activeUsers } = useCollaboration();

    if (activeUsers.length === 0) return null;

    return (
        <div className="fixed top-16 right-4 z-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3 max-w-xs">
            <div className="flex items-center space-x-2 mb-2">
                <CustomIcon name="user" size={20} />
                <span className="text-sm font-medium">Active Users</span>
            </div>
            <div className="space-y-2">
                {activeUsers.map(user => (
                    <div key={user.id} className="flex items-center space-x-2">
                        <div className="relative">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                {user.userName.charAt(0)}
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{user.userName}</div>
                            {user.editingItem && (
                                <div className="text-xs text-gray-500">Editing item</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserPresenceIndicator;