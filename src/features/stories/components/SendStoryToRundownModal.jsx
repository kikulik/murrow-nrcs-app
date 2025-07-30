// src/features/stories/components/SendStoryToRundownModal.jsx
import React, { useState, useEffect } from 'react';
import CustomIcon from '../../../components/ui/CustomIcon';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import ModalBase from '../../../components/common/ModalBase';

const SendStoryToRundownModal = ({ story, onCancel }) => {
    const { appState } = useAppContext();
    const { db } = useAuth();
    const [selectedRundownId, setSelectedRundownId] = useState('');
    const [sending, setSending] = useState(false);

    const availableRundowns = appState.rundowns.filter(r => !r.archived);

    useEffect(() => {
        if (availableRundowns.length > 0 && !selectedRundownId) {
            setSelectedRundownId(availableRundowns[0].id);
        }
    }, [availableRundowns, selectedRundownId]);

    const handleRundownChange = (e) => {
        setSelectedRundownId(e.target.value);
    };

    const handleSend = async () => {
        if (!selectedRundownId || !db) {
            alert('Please select a rundown');
            return;
        }

        setSending(true);
        try {
            const { doc, getDoc, updateDoc } = await import('firebase/firestore');
            
            const rundownRef = doc(db, "rundowns", selectedRundownId);
            const rundownDoc = await getDoc(rundownRef);

            if (!rundownDoc.exists()) {
                throw new Error("Selected rundown not found");
            }

            const rundownData = rundownDoc.data();

            // Determine story type from existing types or infer from title
            let storyTypes = [];
            if (story.types && Array.isArray(story.types) && story.types.length > 0) {
                storyTypes = story.types;
            } else if (story.tags && Array.isArray(story.tags) && story.tags.length > 0) {
                storyTypes = story.tags;
            } else {
                // Try to detect video type from title
                const videoType = ['PKG', 'VO', 'SOT', 'VID'].find(type =>
                    story.title.toUpperCase().includes(`[${type}]`) || 
                    story.title.toUpperCase().includes(type)
                );
                storyTypes = videoType ? [videoType] : ['STD'];
            }

            const newRundownItem = {
                id: Date.now() + Math.random(), // Ensure unique ID
                time: "00:00:00",
                title: story.title,
                duration: story.duration || "01:00",
                type: storyTypes,
                content: story.content || '',
                storyId: story.id,
                storyStatus: 'Ready for Air',
                authorId: story.authorId
            };

            const updatedItems = [...(rundownData.items || []), newRundownItem];
            
            await updateDoc(rundownRef, { 
                items: updatedItems,
                lastModified: new Date().toISOString()
            });

            console.log('Successfully sent story to rundown:', selectedRundownId);
            onCancel();
        } catch (error) {
            console.error("Error sending story to rundown:", error);
            alert(`Failed to send story to rundown: ${error.message}`);
        } finally {
            setSending(false);
        }
    };

    const selectedRundown = availableRundowns.find(r => r.id === selectedRundownId);

    return (
        <ModalBase onCancel={onCancel} title={`Send "${story.title}" to...`} maxWidth="max-w-md">
            <div className="p-6 space-y-4">
                {availableRundowns.length > 0 ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Select a Rundown
                        </label>
                        <select
                            value={selectedRundownId}
                            onChange={handleRundownChange}
                            className="w-full form-input"
                        >
                            <option value="">-- Select Rundown --</option>
                            {availableRundowns.map(rundown => (
                                <option key={rundown.id} value={rundown.id}>
                                    {rundown.name}
                                </option>
                            ))}
                        </select>
                        
                        {selectedRundown && (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="text-sm">
                                    <p><strong>Selected:</strong> {selectedRundown.name}</p>
                                    <p><strong>Air Date:</strong> {new Date(selectedRundown.airDate).toLocaleString()}</p>
                                    <p><strong>Current Items:</strong> {selectedRundown.items?.length || 0}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-3">No active rundowns available.</p>
                        <p className="text-xs text-gray-400">Please create a rundown first before sending stories.</p>
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end space-x-3 border-t">
                <button 
                    type="button" 
                    onClick={onCancel} 
                    className="btn-secondary"
                    disabled={sending}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSend}
                    className="btn-primary"
                    disabled={!selectedRundownId || sending || availableRundowns.length === 0}
                >
                    <CustomIcon name="send" size={32} />
                    <span>{sending ? 'Sending...' : 'Send to Rundown'}</span>
                </button>
            </div>
        </ModalBase>
    );
};

export default SendStoryToRundownModal;
