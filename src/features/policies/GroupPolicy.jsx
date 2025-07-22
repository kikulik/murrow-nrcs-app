// src/features/policies/GroupPolicy.jsx
// Group policies management (future implementation)
import React, { useState } from 'react';
import { Shield, Users, Settings } from 'lucide-react';

const GroupPolicy = ({ group, onSave, onCancel }) => {
    const [policies, setPolicies] = useState({
        canCreateStories: group?.policies?.canCreateStories || false,
        canEditOwnStories: group?.policies?.canEditOwnStories || true,
        canEditAnyStories: group?.policies?.canEditAnyStories || false,
        canDeleteStories: group?.policies?.canDeleteStories || false,
        canManageRundowns: group?.policies?.canManageRundowns || false,
        canGoLive: group?.policies?.canGoLive || false,
        maxStoriesPerDay: group?.policies?.maxStoriesPerDay || 10,
        requiresApproval: group?.policies?.requiresApproval || false
    });

    // This component will be expanded in future implementations
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold">Group Policies: {group?.name}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Story Permissions</h4>
                    {/* Policy checkboxes will be implemented here */}
                </div>

                <div className="space-y-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Workflow Settings</h4>
                    {/* Additional policy controls will be implemented here */}
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 italic">
                    Group policies feature coming in future release...
                </p>
            </div>
        </div>
    );
};

export default GroupPolicy;