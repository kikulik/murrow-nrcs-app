// src/components/collaboration/TakeOverDropdown.jsx
import React, { useState, useRef, useEffect } from 'react';
import CustomIcon from '../ui/CustomIcon';

const TakeOverDropdown = ({ editingUser, onTakeOver }) => {
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

    const handleTakeOver = () => {
        onTakeOver();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 text-orange-600 hover:text-orange-800 rounded bg-orange-100 hover:bg-orange-200"
                title={`Take over from ${editingUser.userName}`}
            >
                <CustomIcon name="user" size={16} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-50 min-w-48">
                    <div className="p-3">
                        <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                            onClick={handleTakeOver}>
                            <CustomIcon name="lock" size={24} className="text-orange-600" />
                            <div className="flex-1">
                                <div className="text-sm font-medium">Unlock</div>
                                <div className="text-xs text-gray-500">Take over from {editingUser.userName}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TakeOverDropdown;
