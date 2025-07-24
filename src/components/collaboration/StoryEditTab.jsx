// src/components/collaboration/StoryEditTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import CustomIcon from '../ui/CustomIcon';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { useCollaboration } from '../../context/CollaborationContext';
import InputField from '../ui/InputField';
import CollaborativeTextEditor from './CollaborativeTextEditor';
import UserPresenceIndicator from './UserPresenceIndicator';
import { RUNDOWN_ITEM_TYPES } from '../../lib/constants';
import { calculateReadingTime, getWordCount } from '../../utils/textDurationCalculator';

const StoryEditTab = () => {
    const { currentUser, db } = useAuth();
    const { appState, setAppState } = useAppContext();
    const { 
        stopEditingStory, 
        saveStoryProgress, 
        getStoryProgress,
        safeUpdateRundown,
        getItemLockInfo,
        isCurrentUserOwner,
        takeOverStory,
        getUserEditingItem
    } = useCollaboration();

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        duration: '01:00',
        type: ['STD']
    });
    const [useCalculatedDuration, setUseCalculatedDuration] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [realTimeContent, setRealTimeContent] = useState('');

    const itemId = appState.editingStoryId;
    const lockInfo = getItemLockInfo(itemId);
    const isOwner = isCurrentUserOwner(itemId);
    const isReadOnly = !isOwner && lockInfo.locked;
    const otherEditor = getUserEditingItem(itemId);

    useEffect(() => {
        if (appState.editingStoryData) {
            const data = {
                title: appState.editingStoryData.title || '',
                content: appState.editingStoryData.content || '',
                duration: appState.editingStoryData.duration || '01:00',
                type: Array.isArray(appState.editingStoryData.type) ? appState.editingStoryData.type : [appState.editingStoryData.type || 'STD']
            };
            setFormData(data);
            setRealTimeContent(data.content);
        }
    }, [appState.editingStoryData]);

    useEffect(() => {
        const loadSavedProgress = async () => {
            if (itemId) {
                const savedData = await getStoryProgress(itemId);
                if (savedData && isOwner) {
                    setFormData(savedData);
                    setRealTimeContent(savedData.content);
                    setLastSave
