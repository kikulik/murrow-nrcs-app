// src/features/assignments/components/AssignmentEditor.jsx
import React, { useState } from 'react';
import CustomIcon from '../../../components/ui/CustomIcon';
import { useAppContext } from '../../../context/AppContext';
import InputField from '../../../components/ui/InputField';
import SelectField from '../../../components/ui/SelectField';

const AssignmentEditor = ({ assignment, onSave, onCancel }) => {
    const { appState } = useAppContext();

    const [formData, setFormData] = useState({
        title: assignment?.title || '',
        assigneeId: assignment?.assigneeId || '',
        deadline: assignment?.deadline ? new Date(assignment.deadline).toISOString().slice(0, 16) : '',
        details: assignment?.details || '',
        status: assignment?.status || 'assigned'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...assignment,
            ...formData,
            deadline: new Date(formData.deadline).toISOString()
        });
    };

    return (
        <div className="bg-purple-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-purple-500 p-6 my-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-semibold">
                    {assignment ? 'Edit Assignment' : 'Create New Assignment'}
                </h3>

                <InputField
                    label="Title"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                />

                <SelectField
                    label="Assign To"
                    value={formData.assigneeId}
                    onChange={e => setFormData({ ...formData, assigneeId: e.target.value })}
                    options={appState.users.map(u => ({ value: u.id, label: u.name }))}
                />

                <InputField
                    label="Deadline"
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    required
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Details
                    </label>
                    <textarea
                        value={formData.details}
                        onChange={e => setFormData({ ...formData, details: e.target.value })}
                        rows={4}
                        className="w-full form-input"
                        placeholder="Assignment details..."
                    />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">
                        <CustomIcon name="save" size={16} />
                        <span>Save</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AssignmentEditor;
