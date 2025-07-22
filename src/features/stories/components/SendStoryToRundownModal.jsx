// src/features/stories/components/SendStoryToRundownModal.jsx
// Modal for sending stories to rundowns
import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import ModalBase from '../../../components/common/ModalBase';
import SelectField from '../../../components/ui/SelectField';

const SendStoryToRundownModal = ({ story, onCancel }) => {
    const { appState } = useAppContext();
    const [selectedRundownId, setSelectedRundownId] = useState('');

    const availableRundowns = appState.rundowns.filter(r => !r.archived);

    useEffect(() => {
        if (availableRundowns.length > 0) {
            setSelectedRundownId(availableRundowns[0].id);
        }
    }, [availableRundowns]);

    const handleSend = async () => {
        if (!selectedRundownId) return;

        // Implementation will be handled by the service layer
        // sendStoryToRundown(story.id, selectedRundownId);
        onCancel();
    };

    return (
        <ModalBase onCancel={onCancel} title={`Send "${story.title}" to...`}>
            <div className="p-6 space-y-4">
                <SelectField
                    label="Select a Rundown"
                    value={selectedRundownId}
                    onChange={e => setSelectedRundownId(e.target.value)}
                    options={availableRundowns.map(r => ({ value: r.id, label: r.name }))}
                />
                {availableRundowns.length === 0 && (
                    <p className="text-sm text-gray-500">No active rundowns available.</p>
                )}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button onClick={handleSend} className="btn-primary" disabled={!selectedRundownId}>
                    <Send className="w-4 h-4" />
                    <span>Send to Rundown</span>
                </button>
            </div>
        </ModalBase>
    );
};

export default SendStoryToRundownModal;