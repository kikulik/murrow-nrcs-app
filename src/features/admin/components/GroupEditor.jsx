// src/features/admin/components/GroupEditor.jsx
// Inline group editor component
import React, { useState } from 'react';
import InputField from '../../../components/ui/InputField';

const GroupEditor = ({ group, onSave, onCancel }) => {
    const [name, setName] = useState(group?.name || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...group, name });
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-700/50 p-4 my-2 rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField
                    label="Group Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />
                <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Save</button>
                </div>
            </form>
        </div>
    );
};

export default GroupEditor;