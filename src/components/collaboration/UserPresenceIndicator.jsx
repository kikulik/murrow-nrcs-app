// src/components/collaboration/UserPresenceIndicator.jsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import CustomIcon from '../ui/CustomIcon';
import { useCollaboration } from '../../context/CollaborationContext';

const UserPresenceIndicator = ({ itemId, className = '' }) => {
    const { getUserEditingItem, getItemLockInfo } = useCollaboration();
    const [stableUser, setStableUser] = useState(null);

    const editingUser = getUserEditingItem(itemId);
    const lockInfo = getItemLockInfo(itemId);

    useEffect(() => {
        if (lockInfo.locked && lockInfo.owner) {
            setStableUser({
                userId: lockInfo.owner.userId,
                userName: lockInfo.owner.userName,
                isOwner: lockInfo.ownedByCurrentUser
            });
        } else if (editingUser && editingUser.userId) {
            setStableUser({
                ...editingUser,
                isOwner: editingUser.isOwner || false
            });
        } else {
            const clearTimer = setTimeout(() => {
                setStableUser(null);
            }, 1000);
            return () => clearTimeout(clearTimer);
        }
    }, [lockInfo, editingUser]);

    if (!stableUser) return null;

    const isCurrentUserOwner = lockInfo.ownedByCurrentUser;
    const indicatorColor = isCurrentUserOwner ? 'bg-blue-500' : 'bg-orange-500';
    const statusColor = isCurrentUserOwner ? 'text-blue-600' : 'text-orange-600';

    return (
        <div className={`flex items-center space-x-1 ${className}`}>
            <div className="relative">
                <div className={`w-6 h-6 rounded-full ${indicatorColor} flex items-center justify-center text-white text-xs font-bold`}>
                    {stableUser.userName.charAt(0)}
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <span className={`text-xs font-medium ${statusColor}`}>
                {isCurrentUserOwner ? 'You are editing' : `${stableUser.userName} is editing`}
            </span>
        </div>
    );
};

export const ActiveUsersPanel = () => {
    const { activeUsers } = useCollaboration();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const stableUsers = useMemo(() => {
        return activeUsers.map((user, index) => ({
            ...user,
            stableId: `${user.userId}-${index}`
        }));
    }, [activeUsers.length, activeUsers.map(u => u.userId).join(',')]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (stableUsers.length === 0) return null;

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <div className="flex -space-x-1">
                    {stableUsers.slice(0, 3).map((user) => (
                        <div
                            key={user.stableId}
                            className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white relative"
                            title={user.userName}
                        >
                            {user.userName.charAt(0)}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-white"></div>
                        </div>
                    ))}
                    {stableUsers.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                            +{stableUsers.length - 3}
                        </div>
                    )}
                </div>
                <span className="text-sm font-medium">
                    {stableUsers.length} online
                </span>
                <CustomIcon
                    name={isOpen ? "close" : "add story"}
                    size={16}
                    className="text-gray-400"
                />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-50">
                    <div className="p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-sm font-medium">Active Users</span>
                        </div>
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                            {stableUsers.map((user) => (
                                <div key={user.stableId} className="flex items-center space-x-3">
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-bold">
                                            {user.userName.charAt(0)}
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{user.userName}</div>
                                        {user.editingItem ? (
                                            <div className={`text-xs ${user.isOwner ? 'text-blue-500' : 'text-orange-500'}`}>
                                                {user.isOwner ? 'Currently editing' : 'Viewing (read-only)'}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-500">Online</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserPresenceIndicator;
