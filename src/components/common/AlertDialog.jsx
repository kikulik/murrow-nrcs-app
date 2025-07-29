// src/components/common/AlertDialog.jsx
import React from 'react';
import CustomIcon from '../ui/CustomIcon';
import ModalBase from './ModalBase';

/**
 * A simple alert dialog component.
 * @param {object} props - The component props.
 * @param {string} props.title - The title of the alert.
 * @param {string} props.message - The message to display in the alert.
 * @param {function} props.onClose - The function to call when the dialog is closed.
 */
const AlertDialog = ({ title, message, onClose }) => (
    <ModalBase onCancel={onClose} title={title} maxWidth="max-w-md">
        <div className="p-6">
            <div className="flex items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CustomIcon name="notification" size={40} className="text-blue-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
                </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm"
                >
                    OK
                </button>
            </div>
        </div>
    </ModalBase>
);

export default AlertDialog;
