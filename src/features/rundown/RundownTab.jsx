// src/features/rundown/RundownTab.jsx
import React, { useState, useEffect } from 'react';
import { Send, Trash2, Archive, CheckCircle } from 'lucide-react';
import CustomIcon from '../../components/ui/CustomIcon';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getUserPermissions } from '../../lib/permissions';
import { calculateTotalDuration, formatDuration } from '../../utils/helpers';
import RundownList from './components/RundownList';
import PrintDropdown from './components/PrintDropdown';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';

const RundownTab = ({ liveMode }) => {
    const { currentUser, db } = useAuth();
    const { appState, setAppState } = useAppContext();
    const [selectedItems, setSelectedItems] = useState([]);
    const [copiedItems, setCopiedItems] = useState([]);
    const [studioQueue, setStudioQueue] = useState(null);
    const [showStudioModal, setShowStudioModal] = useState(false);
    const [studioModalType, setStudioModalType] = useState('');
    const [channelAssignments, setChannelAssignments] = useState(new Map());

    const userPermissions = getUserPermissions(currentUser.role);
    const canGoLive = userPermissions.canGoLive;
    const canManageStudio = userPermissions.canCreateRundowns || userPermissions.canManageUsers;

    const currentRundown = appState.rundowns.find(r => r.id === appState.activeRundownId);
    const totalDuration = calculateTotalDuration(currentRundown?.items || []);
    const availableRundowns = appState.rundowns.filter(r => appState.showArchived || !r.archived);
    const isRundownLocked = liveMode.isLive && liveMode.liveRundownId === appState.activeRundownId;

    useEffect(() => {
        if (currentRundown?.items) {
            const newAssignments = new Map();
            currentRundown.items.forEach((item, index) => {
                const defaultChannel = (index % 2) + 1;
                newAssignments.set(item.id, defaultChannel);
            });
            setChannelAssignments(newAssignments);
        }
    }, [currentRundown?.items]);

    useEffect(() => {
        checkStudioQueue();
    }, [db]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'c' && selectedItems.length > 0) {
                    e.preventDefault();
                    handleCopyItems();
                } else if (e.key === 'v' && copiedItems.length > 0 && currentRundown) {
                    e.preventDefault();
                    handlePasteItems();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedItems, copiedItems, currentRundown]);

    const checkStudioQueue = async () => {
        if (!db) return;
        try {
            const studioRef = doc(db, "settings", "studio");
            const studioDoc = await getDoc(studioRef);
            if (studioDoc.exists()) {
                const data = studioDoc.data();
                setStudioQueue(data.queuedRundownId ? {
                    rundownId: data.queuedRundownId,
                    rundownName: data.rundownName,
                    queuedBy: data.queuedBy,
                    queuedAt: data.queuedAt
                } : null);
            }
        } catch (error) {
            console.error("Error checking studio queue:", error);
        }
    };

    const formatAirDate = (airDate) => {
        if (!airDate) return 'No air date set';
        return new Date(airDate).toLocaleString();
    };

    const getAirTime = (airDate) => {
        if (!airDate) return '12:00';
        const date = new Date(airDate);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const handleDeleteRundown = () => {
        if (!currentRundown) return;
        setAppState(prev => ({
            ...prev,
            modal: { type: 'deleteConfirm', id: currentRundown.id, itemType: 'rundowns' }
        }));
    };

    const handleArchiveRundown = async () => {
        if (!currentRundown || !db) return;

        const confirmArchive = window.confirm(`Are you sure you want to archive "${currentRundown.name}"?`);
        if (!confirmArchive) return;

        try {
            const rundownRef = doc(db, "rundowns", currentRundown.id);
            await updateDoc(rundownRef, { archived: true });

            setAppState(prev => ({ ...prev, activeRundownId: null }));
            setSelectedItems([]);
        } catch (error) {
            console.error("Failed to archive rundown:", error);
            alert("Failed to archive rundown. Please try again.");
        }
    };

    const handleRundownItemUpdate = async (updatedItems) => {
        if (!db || !currentRundown) return;
        const rundownRef = doc(db, "rundowns", currentRundown.id);
        try {
            await updateDoc(rundownRef, { items: updatedItems });
            
            const newAssignments = new Map(channelAssignments);
            updatedItems.forEach((item, index) => {
                if (!newAssignments.has(item.id)) {
                    newAssignments.set(item.id, (index % 2) + 1);
                }
            });
            setChannelAssignments(newAssignments);
        } catch (error) {
            console.error("Failed to update rundown items:", error);
        }
    };

    const handleChannelAssignmentChange = async (itemId, newChannel) => {
        setChannelAssignments(prev => new Map(prev.set(itemId, newChannel)));
        
        if (currentRundown) {
            try {
                const updatedItems = currentRundown.items.map(item => {
                    if (item.id === itemId) {
                        return { ...item, assignedChannel: newChannel };
                    }
                    return item;
                });
                await handleRundownItemUpdate(updatedItems);
            } catch (error) {
                console.error("Failed to save channel assignment:", error);
            }
        }
    };

    const handleRundownChange = (e) => {
        const value = e.target.value;
        if (value === '') return;
        setAppState(prev => ({ ...prev, activeRundownId: value }));
        setSelectedItems([]);
    };

    const openNewRundown = () => {
        if (!userPermissions.canCreateRundowns) {
            alert('You do not have permission to create rundowns');
            return;
        }
        setAppState(prev => ({ ...prev, modal: { type: 'rundownEditor' } }));
    };

    const openAddStoryModal = () => {
        if (!userPermissions.canCreateRundownItems) {
            alert('You do not have permission to add rundown items');
            return;
        }
        setAppState(prev => ({ ...prev, modal: { type: 'addStoryToRundown' } }));
    };

    const handleSendSelectedToStories = () => {
        if (selectedItems.length === 0) {
            alert('Please select items to send to stories');
            return;
        }

        const selectedRundownItems = currentRundown.items.filter(item =>
            selectedItems.includes(item.id)
        );

        setAppState(prev => ({
            ...prev,
            modal: {
                type: 'sendMultipleToStories',
                rundownItems: selectedRundownItems
            }
        }));
    };

    const handleCopyItems = () => {
        if (selectedItems.length === 0) return;

        const selectedRundownItems = currentRundown.items.filter(item =>
            selectedItems.includes(item.id)
        );

        setCopiedItems(selectedRundownItems);
        localStorage.setItem('copiedRundownItems', JSON.stringify(selectedRundownItems));
    };

    const handlePasteItems = async () => {
        let itemsToPaste = copiedItems;

        if (itemsToPaste.length === 0) {
            const storedItems = localStorage.getItem('copiedRundownItems');
            if (storedItems) {
                try {
                    itemsToPaste = JSON.parse(storedItems);
                } catch (error) {
                    console.error('Error parsing stored items:', error);
                    return;
                }
            }
        }

        if (itemsToPaste.length === 0) return;

        try {
            const newItems = itemsToPaste.map(item => ({
                ...item,
                id: Date.now() + Math.random(),
                storyId: null,
                storyStatus: 'Ready for Air'
            }));

            const updatedItems = [...(currentRundown?.items || []), ...newItems];
            await handleRundownItemUpdate(updatedItems);
        } catch (error) {
            console.error('Error pasting items:', error);
        }
    };

    const handleSendToStudio = async () => {
        if (!currentRundown || !canManageStudio) {
            alert("You don't have permission to send rundowns to studio.");
            return;
        }

        if (studioQueue) {
            setStudioModalType('busy');
            setShowStudioModal(true);
            return;
        }

        setStudioModalType('confirm');
        setShowStudioModal(true);
    };

    const confirmSendToStudio = async () => {
        if (!currentRundown || !db) return;

        try {
            const studioRef = doc(db, "settings", "studio");
            await setDoc(studioRef, {
                queuedRundownId: currentRundown.id,
                rundownName: currentRundown.name,
                queuedBy: currentUser.name,
                queuedAt: new Date().toISOString(),
                isLive: false,
                channelAssignments: Object.fromEntries(channelAssignments)
            }, { merge: true });

            await checkStudioQueue();
            setShowStudioModal(false);
            alert(`"${currentRundown.name}" has been queued for studio playout with channel assignments.`);
        } catch (error) {
            console.error("Failed to send rundown to studio:", error);
            alert("Error: Could not send rundown to studio.");
        }
    };

    const handleRemoveFromStudio = async () => {
        if (!canManageStudio || !studioQueue) return;

        const confirmRemove = window.confirm(`Remove "${studioQueue.rundownName}" from studio queue?`);
        if (!confirmRemove) return;

        try {
            const studioRef = doc(db, "settings", "studio");
            await setDoc(studioRef, {
                queuedRundownId: null,
                rundownName: null,
                queuedBy: null,
                queuedAt: null,
                isLive: false,
                channelAssignments: null
            });

            setStudioQueue(null);
            alert("Rundown removed from studio queue.");
        } catch (error) {
            console.error("Failed to remove rundown from studio:", error);
            alert("Error: Could not remove rundown from studio.");
        }
    };

    const handleGoLive = async () => {
        if (!studioQueue || !canGoLive) {
            alert('No rundown queued for studio or insufficient permissions');
