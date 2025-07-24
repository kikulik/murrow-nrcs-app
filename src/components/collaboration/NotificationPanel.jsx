// src/components/collaboration/NotificationPanel.jsx
import React, { useState, useRef, useEffect } from 'react';
import CustomIcon from '../ui/CustomIcon';
import { useCollaboration } from '../../context/CollaborationContext';

const NotificationPanel = () => {
    const { notifications, markNotificationAsRead } = useCollaboration();
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

    const handleNotificationClick = async (notification) => {
        await markNotificationAsRead(notification.id);
    };

    const unreadCount = notifications.length;

    if (unreadCount === 0) {
        return (
            <CustomIcon
                name="notification"
                size={40}
                className="text-gray-500 dark:text-gray-400"
            />
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
                <CustomIcon
                    name="notification"
                    size={40}
                    className="text-orange-500 dark:text-orange-400"
                />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium">Notifications</h3>
                            <span className="text-sm text-gray-500">{unreadCount} unread</span>
                        </div>
                    </div>

                    <div className="divide-y dark:divide-gray-700">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                        {notification.type === 'takeOver' ? (
                                            <CustomIcon name="user" size={32} className="text-orange-500" />
                                        ) : (
                                            <CustomIcon name="notification" size={32} className="text-blue-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(notification.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {notifications.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <CustomIcon name="notification" size={40} className="mx-auto mb-2 opacity-50" />
                            <p>No new notifications</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;