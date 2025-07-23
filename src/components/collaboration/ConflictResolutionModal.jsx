// src/components/collaboration/ConflictResolutionModal.jsx
import React from 'react';
import CustomIcon from '../ui/CustomIcon';
import ModalBase from '../common/ModalBase';
import { useCollaboration } from '../../context/CollaborationContext';

const ConflictResolutionModal = ({ conflict, onResolve, onCancel }) => {
    const { resolveConflict } = useCollaboration();

    if (!conflict) return null;

    const { local, server } = conflict;

    const handleResolve = (strategy) => {
        resolveConflict(local.id, strategy);
        onResolve(strategy);
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <ModalBase onCancel={onCancel} title="Resolve Editing Conflict" maxWidth="max-w-4xl">
            <div className="p-6 space-y-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                        <CustomIcon name="notification" size={24} className="text-yellow-600" />
                        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                            Editing Conflict Detected
                        </h3>
                    </div>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                        This item has been modified by another user while you were editing it.
                        Please choose how to resolve this conflict.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <CustomIcon name="user" size={20} className="text-blue-600" />
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200">Your Changes</h4>
                            <span className="text-xs text-gray-500">
                                Modified: {formatTimestamp(local.lastModified)}
                            </span>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title:</label>
                                    <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border mt-1">
                                        {local.title}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</label>
                                    <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border mt-1">
                                        {local.duration}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content:</label>
                                    <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border mt-1 max-h-32 overflow-y-auto">
                                        {local.content || 'No content'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <CustomIcon name="user" size={20} className="text-green-600" />
                            <h4 className="font-semibold text-green-800 dark:text-green-200">Server Version</h4>
                            <span className="text-xs text-gray-500">
                                Modified: {formatTimestamp(server.lastModified)}
                            </span>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title:</label>
                                    <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border mt-1">
                                        {server.title}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</label>
                                    <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border mt-1">
                                        {server.duration}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content:</label>
                                    <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border mt-1 max-h-32 overflow-y-auto">
                                        {server.content || 'No content'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <button
                        onClick={() => handleResolve('client-wins')}
                        className="flex-1 btn-primary bg-blue-600 hover:bg-blue-700"
                    >
                        <CustomIcon name="user" size={20} />
                        <span>Use My Changes</span>
                    </button>

                    <button
                        onClick={() => handleResolve('server-wins')}
                        className="flex-1 btn-primary bg-green-600 hover:bg-green-700"
                    >
                        <CustomIcon name="save" size={20} />
                        <span>Use Server Version</span>
                    </button>

                    <button
                        onClick={() => handleResolve('merge')}
                        className="flex-1 btn-primary bg-purple-600 hover:bg-purple-700"
                    >
                        <CustomIcon name="stories" size={20} />
                        <span>Merge Both</span>
                    </button>

                    <button
                        onClick={onCancel}
                        className="flex-1 btn-secondary"
                    >
                        <CustomIcon name="cancel" size={20} />
                        <span>Cancel</span>
                    </button>
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <strong>Resolution Options:</strong><br />
                    • <strong>Use My Changes:</strong> Keep your edits and overwrite the server version<br />
                    • <strong>Use Server Version:</strong> Discard your changes and keep the server version<br />
                    • <strong>Merge Both:</strong> Automatically combine both versions (newer fields win)<br />
                    • <strong>Cancel:</strong> Don't resolve now, you can edit again later
                </div>
            </div>
        </ModalBase>
    );
};

export default ConflictResolutionModal;