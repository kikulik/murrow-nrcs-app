// src/features/admin/components/UserEditor.jsx
import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import InputField from '../../../components/ui/InputField';
import SelectField from '../../../components/ui/SelectField';
import { PERMISSIONS } from '../../../lib/permissions';

const UserEditor = ({ user, onSave, onCancel }) => {
    const { appState } = useAppContext();

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        groupId: user?.groupId || '',
        role: user?.role || 'Journalist'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...user, ...formData });
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-700/50 p-4 my-2 rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField
                    label="Name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                />

                <InputField
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                />

                <SelectField
                    label="Group"
                    value={formData.groupId}
                    onChange={e => setFormData({ ...formData, groupId: e.target.value })}
                    options={appState.groups.map(g => ({ value: g.id, label: g.name }))}
                />

                <SelectField
                    label="Role"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    options={Object.keys(PERMISSIONS).map(p => ({ value: p, label: p }))}
                />

                <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Save</button>
                </div>
            </form>
        </div>
    );
};

export default UserEditor;
