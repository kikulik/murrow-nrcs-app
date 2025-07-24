// src/features/assignments/AssignmentsTab.jsx
import React, { useState } from 'react';
import CustomIcon from '../../components/ui/CustomIcon';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getUserPermissions } from '../../lib/permissions';
import { getStatusColor } from '../../utils/styleHelpers';
import AssignmentEditor from './components/AssignmentEditor';

const AssignmentsTab = () => {
    const { currentUser, db } = useAuth();
    const { appState, setAppState } = useAppContext();
    const [editingId, setEditingId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const userPermissions = getUserPermissions(currentUser.role);
    const getUserById = (id) => appState.users.find(u => u.id === id || u.uid === id);

    // Filter assignments based on permissions
    const visibleAssignments = appState.assignments.filter(assignment => {
        if (userPermissions.canCreateAssignments) {
            // Admins and Producers can see all assignments
            return true;
        } else {
            // Other users can only see assignments assigned to them
            return assignment.assigneeId === currentUser.uid || assignment.assigneeId === currentUser.id;
        }
    });

    const handleSave = async (assignment) => {
        if (!db) return;
        try {
            const { doc, updateDoc, addDoc, collection } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            if (assignment.id) {
                const docRef = doc(db, "assignments", assignment.id);
                const { id, ...dataToUpdate } = assignment;
                await updateDoc(docRef, dataToUpdate);
            } else {
                await addDoc(collection(db, "assignments"), assignment);
            }
        } catch (error) {
            console.error("Error saving assignment:", error);
        } finally {
            setEditingId(null);
            setIsCreating(false);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsCreating(false);
    };

    const handleDelete = (id) => {
        if (!userPermissions.canCreateAssignments) {
            alert('You do not have permission to delete assignments');
            return;
        }
        setAppState(prev => ({
            ...prev,
            modal: { type: 'deleteConfirm', id, itemType: 'assignments' }
        }));
    };

    const handleCreate = () => {
        if (!userPermissions.canCreateAssignments) {
            alert('You do not have permission to create assignments. Only Producers and Admins can create assignments.');
            return;
        }
        setIsCreating(true);
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
                        {userPermissions.canCreateAssignments && (
                            <button
                                onClick={() => setEditingId(assignment.id)}
                                className="p-2 text-gray-500 hover:text-blue-600 rounded"
                            >
                                <CustomIcon name="edit" size={32} />
                            </button>
                        )}
                        {userPermissions.canCreateAssignments && (
                            <button
                                onClick={() => handleDelete(assignment.id)}
                                className="p-2 text-gray-500 hover:text-red-600 rounded"
                            >
                                <CustomIcon name="cancel" size={32} />
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
                {userPermissions.canCreateAssignments && (
                    <button onClick={handleCreate} className="btn-primary">
                        <CustomIcon name="assignments" size={32} />
                        <span>New Assignment</span>
                    </button>
                )}
            </div>

            {!userPermissions.canCreateAssignments && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                        <CustomIcon name="user" size={24} className="text-blue-600" />
                        <div>
                            <h4 className="font-medium text-blue-800 dark:text-blue-200">Your Assignments</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Showing only assignments assigned to you. Producers and Admins can see all assignments.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {isCreating && (
                    <AssignmentEditor
                        assignment={null}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                )}
                {visibleAssignments.length > 0 ? (
                    visibleAssignments.map(renderAssignment)
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        {userPermissions.canCreateAssignments
                            ? 'No assignments yet. Create your first assignment!'
                            : 'No assignments assigned to you.'
                        }
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssignmentsTab;
