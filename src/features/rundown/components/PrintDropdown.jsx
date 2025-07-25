// src/features/rundown/components/PrintDropdown.jsx
import React, { useState, useRef, useEffect } from 'react';
import CustomIcon from '../../../components/ui/CustomIcon';
import { PrintService } from '../../../services/PrintService';

const PrintDropdown = ({ rundown, disabled, airTime = '12:00' }) => {
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

    const handlePrintForPresenter = () => {
        if (rundown) {
            PrintService.printForPresenter(rundown);
        }
        setIsOpen(false);
    };

    const handlePrintRundownList = () => {
        if (rundown) {
            PrintService.printRundownList(rundown, airTime);
        }
        setIsOpen(false);
    };

    const handleExportRTF = () => {
        if (rundown) {
            PrintService.downloadRTF(rundown);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`btn-secondary flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <CustomIcon name="print" size={32} className="mr-2" />
                <span>Print</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu">
                        <button
                            onClick={handlePrintForPresenter}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <CustomIcon name="print" size={32} className="mr-3" />
                            Print for Presenter
                        </button>
                        <button
                            onClick={handlePrintRundownList}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <CustomIcon name="print" size={32} className="mr-3" />
                            Print Rundown List
                        </button>
                        <button
                            onClick={handleExportRTF}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <CustomIcon name="print" size={32} className="mr-3" />
                            Export RTF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrintDropdown;
