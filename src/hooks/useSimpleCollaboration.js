// src/hooks/useSimpleCollaboration.js
import { useEffect, useRef, useState } from 'react';
import { subscribeToContentChanges, sendContentUpdate, saveTextDiff } from '../services/collaborationService';

export const useSimpleCollaboration = (itemId, isOwner) => {
    const [content, setContent] = useState('');
    const contentRef = useRef(content);

    useEffect(() => {
        contentRef.current = content;
    }, [content]);

    useEffect(() => {
        if (!itemId) return;

        const unsubscribe = subscribeToContentChanges(itemId, (newContent) => {
            if (!isOwner) {
                setContent(newContent);
            }
        });

        return () => unsubscribe && unsubscribe();
    }, [itemId, isOwner]);

    const saveTextOperation = (prev, next) => {
        if (!isOwner) return;
        if (prev === next) return;

        setContent(next);
        sendContentUpdate(itemId, next);
        saveTextDiff(itemId, prev, next); // optionally store history or audit trail
    };

    return {
        content,
        setContent,
        saveTextOperation
    };
};
