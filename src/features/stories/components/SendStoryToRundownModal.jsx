// src/features/stories/components/SendStoryToRundownModal.jsx
import React, { useState, useEffect } from 'react';
import CustomIcon from '../../../components/ui/CustomIcon';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import ModalBase from '../../../components/common/ModalBase';
import SelectField from '../../../components/ui/SelectField';

const SendStoryToRundownModal = ({ story, onCancel }) => {
    const { appState } = useAppContext();
    const { db } = useAuth();
    const [selectedRundownId, setSelectedRundownId] = useState('');
    const [sending, setSending] = useState(false);

    const availableRundowns = appState.rundowns.filter(r => !r.archived);

    useEffect(() => {
        if (availableRundowns.length > 0) {
            setSelectedRundownId(availableRundowns[0].id);
        }
    }, [availableRundowns]);

    const handleSend = async () => {
        if (!selectedRundownId || !db) return;

        setSending(true);
        try {
            const { doc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

            const rundownRef = doc(db, "rundowns", selectedRundownId);
            const rundownDoc = await getDoc(rundownRef);

            if (!rundownDoc.exists()) {
                throw new Error("Rundown not found");
            }

            const rundownData = rundownDoc.data();

            const defaultVideoType = ['PKG', 'VO', 'SOT', 'VID'].find(type =>
                story.title.toUpperCase().includes(`[${type}]`)
            );

            const newRundownItem = {
                id: Date.now(),
                time: "00:00:00",
                title: story.title,
                duration: story.duration || "01:00",
                type: defaultVideoType ? [defaultVideoType] : ['PKG'],
                content: story.content,
                storyId: story.id,
                storyStatus: 'Not Ready',
            };

            const updatedItems = [...(rundownData.items || []), newRundownItem];
            await updateDoc(rundownRef, { items: updatedItems });

            onCancel();
        } catch (error) {
            console.error("Error sending story to rundown:", error);
            alert("Failed to send story to rundown. Please try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <ModalBase onCancel={onCancel} title={`Send "${story.title}" to...`}>
            <div className="p-6 space-y-4">
                {availableRundowns.length > 0 ? (
                    <SelectField
                        label="Select a Rundown"
                        value={selectedRundownId}
                        onChange={e => setSelectedRundownId(e.target.value)}
                        options={availableRundowns.map(r => ({ value: r.id, label: r.name }))}
                    />
                ) : (
                    <p className="text-sm text-gray-500">No active rundowns available. Please create a rundown first.</p>
                )}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button
                    onClick={handleSend}
                    className="btn-primary"
                    disabled={!selectedRundownId || sending || availableRundowns.length === 0}
                >
                    <CustomIcon name="send" size={16} />
                    <span>{sending ? 'Sending...' : 'Send to Rundown'}</span>
                </button>
            </div>
        </ModalBase>
    );
};

export default SendStoryToRundownModal;
