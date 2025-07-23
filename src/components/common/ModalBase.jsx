// src/components/common/ModalBase.jsx
// Base modal component
import React from 'react';
import CustomIcon from '../ui/CustomIcon';

const ModalBase = ({ children, onCancel, title, maxWidth = "max-w-2xl" }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onCancel}>
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold">{title}</h2>
                <button onClick={onCancel} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <CustomIcon name="cancel" size={40} className="text-gray-500" />
                </button>
            </div>
            <div className="overflow-y-auto">{children}</div>
        </div>
    </div>
);

export default ModalBase;
