// src/components/common/ConfirmationDialog.jsx
// Reusable confirmation dialog
import React from 'react';
import CustomIcon from '../ui/CustomIcon';
import ModalBase from './ModalBase';

const ConfirmationDialog = ({ onConfirm, onCancel, title, message }) => (
    <ModalBase onCancel={onCancel} title={title} maxWidth="max-w-md">
        <div className="p-6">
            <div className="flex items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CustomIcon name="notification" size={40} className="text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <p className="text-sm text-gray-500">{message}</p>
                </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                    type="button"
                    onClick={onConfirm}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm"
                >
                    Delete
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                >
                    Cancel
                </button>
            </div>
        </div>
    </ModalBase>
);

export default ConfirmationDialog;
