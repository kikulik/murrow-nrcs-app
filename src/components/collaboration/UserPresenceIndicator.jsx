// src/components/collaboration/UserPresenceIndicator.jsx
import React, { useState, useRef, useEffect } from 'react';
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
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <span className="text-xs text-blue-600 font-medium">
                {editingUser.userName} is editing
            </span>
        </div>
    );
};

export const ActiveUsersPanel = () => {
    const { activeUsers } = useCollaboration();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (activeUsers.length === 0) return null;

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <div className="flex -space-x-1">
                    {activeUsers.slice(0, 3).map(user => (
                        <div
                            key={user.id}
                            className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white relative"
                            title={user.userName}
                        >
                            {user.userName.charAt(0)}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-white"></div>
                        </div>
                    ))}
                    {activeUsers.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                            +{activeUsers.length - 3}
                        </div>
                    )}
                </div>
                <span className="text-sm font-medium">
                    {activeUsers.length} online
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
                            {activeUsers.map(user => (
                                <div key={user.id} className="flex items-center space-x-3">
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-bold">
                                            {user.userName.charAt(0)}
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{user.userName}</div>
                                        {user.editingItem ? (
                                            <div className="text-xs text-orange-500">Currently editing</div>
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
