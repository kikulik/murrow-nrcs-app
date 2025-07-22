// src/features/assignments/AssignmentsTab.jsx
// Assignments management tab
import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Calendar } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getUserPermissions } from '../../lib/permissions';
import { getStatusColor } from '../../utils/styleHelpers';
import AssignmentEditor from './components/AssignmentEditor';

const AssignmentsTab = () => {
    const { currentUser } = useAuth();
    const { appState, setAppState } = useAppContext();
    const [editingId, setEditingId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const userPermissions = getUserPermissions(currentUser.role);
    const getUserById = (id) => appState.users.find(u => u.id === id);

    const handleSave = (assignment) => {
        // Implementation for saving assignment
        setEditingId(null);
        setIsCreating(false);
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsCreating(false);
    };

    const handleDelete = (id) => {
        setAppState(prev => ({
            ...prev,
            modal: { type: 'deleteConfirm', id, itemType: 'assignment' }
        }));
    };

    const renderAssignment = (assignment) => {
        if (editingId === assignment.id) {
            return (
                <AssignmentEditor
                    key={assignment.id}
                    assignment={assignment}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            );
        }

        return (
            <div key={assignment.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium">{assignment.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                                {assignment.status}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 text-sm text-gray-500">
                            <span>Assigned to: {getUserById(assignment.assigneeId)?.name || 'Unassigned'}</span>
                            <span>Deadline: {new Date(assignment.deadline).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm">{assignment.details}</p>
                    </div>
                    <div className="flex items-center space-x-1 ml-4">
                        {userPermissions.canChangeAnyStatus && (
                            <button
                                onClick={() => setEditingId(assignment.id)}
                                className="p-2 text-gray-500 hover:text-blue-600 rounded"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                        )}
                        {userPermissions.canDeleteAnything && (
                            <button
                                onClick={() => handleDelete(assignment.id)}
                                className="p-2 text-gray-500 hover:text-red-600 rounded"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Assignments</h2>
                <button onClick={() => setIsCreating(true)} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    <span>New Assignment</span>
                </button>
            </div>
            <div className="grid gap-4">
                {isCreating && (
                    <AssignmentEditor
                        assignment={null}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                )}
                {appState.assignments.map(renderAssignment)}
            </div>
        </div>
    );
};

export default AssignmentsTab;