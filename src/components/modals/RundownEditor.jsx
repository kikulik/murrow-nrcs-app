// src/components/modals/RundownEditor.jsx
// Rundown creation modal
import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import ModalBase from '../common/ModalBase';
import InputField from '../ui/InputField';
import SelectField from '../ui/SelectField';

const RundownEditor = ({ onCancel }) => {
    const { appState } = useAppContext();
    const [name, setName] = useState('');
    const [templateId, setTemplateId] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Implementation for saving rundown
        onCancel();
    };

    return (
        <ModalBase onCancel={onCancel} title="Create New Rundown">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <InputField
                    label="Rundown Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />
                <SelectField
                    label="Template (Optional)"
                    value={templateId}
                    onChange={e => setTemplateId(e.target.value)}
                    options={appState.rundownTemplates.map(t => ({ value: t.id, label: t.name }))}
                />
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">
                        <Save className="w-4 h-4" />
                        <span>Create</span>
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

export default RundownEditor;