// src/components/collaboration/CollaborativeTextEditor.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCollaboration } from '../../context/CollaborationContext';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';

const CollaborativeTextEditor = ({
    value,
    onChange,
    itemId,
    className = '',
    placeholder = '',
    rows = 4,
    isOwner = true // ACCEPT isOwner as prop with default true
}) => {
    const { currentUser, db } = useAuth();
    const { appState } = useAppContext();
    const { 
        setEditingItem, 
        clearEditingItem, 
        CollaborationManager
    } = useCollaboration();
    
    const [localValue, setLocalValue] = useState(value || '');
    const [pendingOperations, setPendingOperations] = useState([]);
    const [cursorPositions, setCursorPositions] = useState(new Map());
    const textareaRef = useRef(null);
    const lastValueRef = useRef(value || '');
    const operationsListener = useRef(null);

    // FIXED: Use the passed isOwner prop instead of AppState
    const isTakenOver = appState.editingStoryTakenOver;
    const isReadOnly = isTakenOver && !isOwner;

    console.log('CollaborativeTextEditor props:', { isOwner, itemId, hasValue: !!value }); // DEBUG

    useEffect(() => {
        if (value !== lastValueRef.current) {
            setLocalValue(value || '');
            lastValueRef.current = value || '';
        }
    }, [value]);

    // Simplified Firebase operations with better error handling
    useEffect(() => {
        if (!db || !itemId || !isOwner || !CollaborationManager) {
            console.log('Skipping Firebase setup:', { db: !!db, itemId, isOwner, CollaborationManager: !!CollaborationManager });
            return;
        }

        const setupFirebaseListener = async () => {
            try {
                const { collection, query, where, onSnapshot } = await import('firebase/firestore');
                
                // Simplified query without orderBy to avoid index issues
                const operationsQuery = query(
                    collection(db, "textOperations"),
                    where("itemId", "==", itemId)
                );

                operationsListener.current = onSnapshot(
                    operationsQuery,
                    (snapshot) => {
                        const operations = [];
                        snapshot.docs.forEach(doc => {
                            const data = doc.data();
                            if (data.userId !== currentUser.uid) {
                                operations.push({
                                    id: doc.id,
                                    ...data
                                });
                            }
                        });
                        
                        // Sort operations by timestamp on client side
                        operations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                        if (operations.length > 0 && isOwner && CollaborationManager) {
                            try {
                                const newValue = CollaborationManager.applyTextTransform(
                                    lastValueRef.current,
                                    operations
                                );
                                setLocalValue(newValue);
                                lastValueRef.current = newValue;
                                onChange(newValue);
                            } catch (error) {
                                console.error('Error applying text transform:', error);
                            }
                        }
                    },
                    (error) => {
                        console.error('Firebase listener error:', error);
                        // Don't break the component, just log the error
                    }
                );
            } catch (error) {
                console.error('Error setting up Firebase listener:', error);
            }
        };

        setupFirebaseListener();

        return () => {
            if (operationsListener.current) {
                try {
                    operationsListener.current();
                } catch (error) {
                    console.warn('Error cleaning up listener:', error);
                }
            }
        };
    }, [db, itemId, currentUser?.uid, onChange, CollaborationManager, isOwner]);

    const handleFocus = useCallback(async () => {
        if (isOwner && setEditingItem) {
            try {
                await setEditingItem(itemId);
            } catch (error) {
                console.error('Error setting editing item:', error);
            }
        }
    }, [setEditingItem, itemId, isOwner]);

    const handleBlur = useCallback(async () => {
        if (isOwner && clearEditingItem) {
            try {
                await clearEditingItem();
            } catch (error) {
                console.error('Error clearing editing item:', error);
            }
        }
    }, [clearEditingItem, isOwner]);

    const handleChange = useCallback(async (e) => {
        if (!isOwner) return;

        const newValue = e.target.value;
        const oldValue = localValue;

        setLocalValue(newValue);

        // Only try to save operations if we have all required dependencies
        if (CollaborationManager && db && currentUser) {
            try {
                const operations = CollaborationManager.generateTextOperations(oldValue, newValue);

                if (operations.length > 0) {
                    const { collection, addDoc } = await import('firebase/firestore');
                    
                    for (const operation of operations) {
                        await addDoc(collection(db, "textOperations"), {
                            ...operation,
                            itemId,
                            userId: currentUser.uid,
                            userName: currentUser.name,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            } catch (error) {
                console.error('Error saving text operations:', error);
                // Don't prevent local editing if Firebase fails
            }
        }

        onChange(newValue);
        lastValueRef.current = newValue;
    }, [localValue, db, itemId, currentUser, onChange, CollaborationManager, isOwner]);

    const handleCursorChange = useCallback(async (e) => {
        if (!isOwner || !db || !currentUser) return;

        const textarea = e.target;
        const cursorPosition = textarea.selectionStart;

        try {
            const { doc, setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, "cursors", `${itemId}_${currentUser.uid}`), {
                itemId,
                userId: currentUser.uid,
                userName: currentUser.name,
                position: cursorPosition,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating cursor position:', error);
            // Don't break editing if cursor sync fails
        }
    }, [db, itemId, currentUser, isOwner]);

    // Simplified cursor tracking
    useEffect(() => {
        if (!db || !itemId || !isOwner || !currentUser) return;

        const setupCursorListener = async () => {
            try {
                const { collection, query, where, onSnapshot } = await import('firebase/firestore');
                
                const cursorsQuery = query(
                    collection(db, "cursors"),
                    where("itemId", "==", itemId)
                );

                const unsubscribe = onSnapshot(
                    cursorsQuery,
                    (snapshot) => {
                        const positions = new Map();
                        const now = new Date();

                        snapshot.docs.forEach(doc => {
                            const data = doc.data();
                            const timestamp = new Date(data.timestamp);
                            const secondsAgo = (now - timestamp) / 1000;

                            if (secondsAgo < 10 && data.userId !== currentUser.uid) {
                                positions.set(data.userId, {
                                    ...data,
                                    id: doc.id
                                });
                            }
                        });

                        setCursorPositions(positions);
                    },
                    (error) => {
                        console.error('Cursor listener error:', error);
                    }
                );

                return unsubscribe;
            } catch (error) {
                console.error('Error setting up cursor listener:', error);
                return () => {};
            }
        };

        setupCursorListener().then(unsubscribe => {
            if (unsubscribe) {
                return unsubscribe;
            }
        });
    }, [db, itemId, currentUser?.uid, isOwner]);

    const renderCursorIndicators = () => {
        if (!isOwner || cursorPositions.size === 0) return null;
        
        const textarea = textareaRef.current;
        if (!textarea) return null;

        const indicators = [];
        cursorPositions.forEach((cursor, userId) => {
            const textBeforeCursor = localValue.substring(0, cursor.position);
            const lines = textBeforeCursor.split('\n');
            const lineNumber = lines.length;
            const columnNumber = lines[lines.length - 1].length;

            const topOffset = (lineNumber - 1) * 20;
            const leftOffset = columnNumber * 8;

            indicators.push(
                <div
                    key={userId}
                    className="absolute pointer-events-none z-10"
                    style={{
                        top: topOffset + 'px',
                        left: leftOffset + 'px',
                        transform: 'translateX(-50%)'
                    }}
                >
                    <div className="flex flex-col items-center">
                        <div className="w-0.5 h-5 bg-blue-500 animate-pulse"></div>
                        <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                            {cursor.userName}
                        </div>
                    </div>
                </div>
            );
        });

        return (
            <div className="absolute inset-0 pointer-events-none">
                {indicators}
            </div>
        );
    };

    const textareaProps = {
        ref: textareaRef,
        value: localValue,
        onChange: handleChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onSelect: handleCursorChange,
        onClick: handleCursorChange,
        onKeyUp: handleCursorChange,
        className: `w-full form-input relative z-0 ${className} ${isReadOnly ? 'bg-gray-50 dark:bg-gray-700 cursor-not-allowed' : ''}`,
        placeholder: isReadOnly ? 'Read-only: Another user is editing' : placeholder,
        rows: rows,
        disabled: isReadOnly,
        readOnly: isReadOnly
    };

    return (
        <div className="relative">
            <textarea {...textareaProps} />
            {renderCursorIndicators()}

            {pendingOperations.length > 0 && isOwner && (
                <div className="absolute top-2 right-2 bg-yellow-100 border border-yellow-300 rounded px-2 py-1 text-xs">
                    Syncing changes...
                </div>
            )}

            {isReadOnly && appState.editingStoryTakenOverBy && (
                <div className="absolute top-2 right-2 bg-orange-100 border border-orange-300 rounded px-2 py-1 text-xs">
                    {appState.editingStoryTakenOverBy} is editing
                </div>
            )}
        </div>
    );
};

export default CollaborativeTextEditor;
