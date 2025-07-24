// src/components/modals/RundownEditor.jsx
import React, { useState } from 'react';
import CustomIcon from '../ui/CustomIcon';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import ModalBase from '../common/ModalBase';
import InputField from '../ui/InputField';
import SelectField from '../ui/SelectField';
// FIX: Removed the static import of firestore functions.
// They will be imported dynamically inside the handleSubmit function.

const RundownEditor = ({ onCancel }) => {
    const { appState, setAppState } = useAppContext();
    const { db } = useAuth();
    const [name, setName] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [airDate, setAirDate] = useState(new Date().toISOString().slice(0, 16));
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !db) return;

        setSaving(true);
        try {
            // FIX: Dynamically import firestore functions to ensure consistency
            // with other parts of the application.
            const { collection, addDoc } = await import('firebase/firestore');

            let items = [];
            if (templateId) {
                const template = appState.rundownTemplates.find(t => t.id === templateId);
                if (template && template.items) {
                    items = template.items.map(item => ({
                        ...item,
                        id: Date.now() + Math.random(),
                        storyId: null,
                        storyStatus: null
                    }));
                }
            }

            const newRundown = {
                name: name.trim(),
                archived: false,
                items: items,
                created: new Date().toISOString(),
                airDate: airDate
            };

            const docRef = await addDoc(collection(db, "rundowns"), newRundown);
            setAppState(prev => ({ ...prev, activeRundownId: docRef.id }));

            onCancel();
        } catch (error) {
            console.error("Error creating rundown:", error);
            alert("Failed to create rundown. Please try again.");
        } finally {
            setSaving(false);
        }
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

                <InputField
                    label="Air Date & Time"
                    type="datetime-local"
                    value={airDate}
                    onChange={e => setAirDate(e.target.value)}
                    required
                />

                {appState.rundownTemplates.length > 0 && (
                    <SelectField
                        label="Template (Optional)"
                        value={templateId}
                        onChange={e => setTemplateId(e.target.value)}
                        options={[{ value: '', label: '-- No Template --' }, ...appState.rundownTemplates.map(t => ({ value: t.id, label: t.name }))]}
                    />
                )}
                <div className="flex items-center justify-end space-x-3 pt-4">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary" disabled={saving || !name.trim()}>
                        <CustomIcon name="save" size={32} />
                        <span>{saving ? 'Creating...' : 'Create'}</span>
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

export default RundownEditor;
