// src/features/policies/UserPermissions.jsx
// User permissions management (future implementation)
import React from 'react';
import { User, Lock, Key } from 'lucide-react';

const UserPermissions = ({ user, onSave, onCancel }) => {
    // This component will handle individual user permission overrides
    // that may differ from their group policies

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-6">
                <Key className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold">User Permissions: {user?.name}</h3>
            </div>

            <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Current Role: <span className="font-medium">{user?.role}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Group: <span className="font-medium">{user?.group?.name || 'No Group'}</span>
                    </p>
                </div>

                <div className="pt-4">
                    <p className="text-sm text-gray-500 italic">
                        Individual user permission overrides coming in future release...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UserPermissions;