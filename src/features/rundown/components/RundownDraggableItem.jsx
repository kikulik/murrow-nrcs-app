// src/features/rundown/components/RundownDraggableItem.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import CustomIcon from '../../../components/ui/CustomIcon';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useCollaboration } from '../../../context/CollaborationContext';
import { getStatusColor, getRundownTypeColor } from '../../../utils/styleHelpers';
import { RUNDOWN_STORY_STATUSES } from '../../../lib/constants';
import RundownItemEditor from './RundownItemEditor';
import UserPresenceIndicator from '../../../components/collaboration/UserPresenceIndicator';

const RundownDraggableItem = ({
    item,
    index,
    moveItem,
    canDrag,
    isLocked,
    isEditing,
    onToggleEdit,
    onSave,
    onCancel,
    onDeleteItem
}) => {
    const { appState } = useAppContext();
    const { db, currentUser } = useAuth();
    const {
        safeUpdateRundown,
        isItemBeingEdited,
        getUserEditingItem,
        setEditingItem,
        clearEditingItem
    } = useCollaboration();
    const ref = useRef(null);
    const [localItem, setLocalItem] = useState(item);
    const [hasConflict, setHasConflict] = useState(false);

    // Sync local state with prop changes
    useEffect(() => {
        // Check for conflicts
        if (item.version && localItem.version && item.version > localItem.version) {
            setHasConflict(true);
        }
        setLocalItem(item);
    }, [item, localItem.version]);

    const [{ handlerId }, drop] = useDrop({
        accept: 'rundownItem',
        collect(monitor) {
            return { handlerId: monitor.getHandlerId() };
        },
        hover(draggedItem, monitor) {
            if (!ref.current || isLocked || isEditing) return;
            const dragIndex = draggedItem.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

            moveItem(dragIndex, hoverIndex);
            draggedItem.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: 'rundownItem',
        item: () => ({ id: item.id, index }),
        canDrag: canDrag && !isLocked && !isEditing && !isItemBeingEdited(item.id),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    if (canDrag && !isLocked) {
        drag(drop(ref));
    } else {
        drop(ref);
    }

    const story = appState.stories?.find(s => s.id === item.storyId);
    const author = story ?
        appState.users.find(u => u.id === story.authorId || u.uid === story.authorId) :
        item.authorId ? appState.users.find(u => u.id === item.authorId || u.uid === item.authorId) : null;

    const editingUser = getUserEditingItem(item.id);
    const isBeingEditedByOther = editingUser && editingUser.userId !== currentUser.uid;

    const handleStatusChange = async (newStatus) => {
        if (isLocked || !appState.activeRundownId || isBeingEditedByOther) return;

        try {
            await safeUpdateRundown(appState.activeRundownId, (rundownData) => ({
                ...rundownData,
                items: rundownData.items.map(rundownItem =>
                    rundownItem.id === item.id
                        ? {
                            ...rundownItem,
                            storyStatus: newStatus,
                            version: (rundownItem.version || 1) + 1,
                            lastModified: new Date().toISOString(),
                            lastModifiedBy: currentUser.uid
                        }
                        : rundownItem
                )
            }));
        } catch (error) {
            console.error("Error updating story status:", error);
            // Show conflict resolution if needed
            if (error.message.includes('conflict')) {
                setHasConflict(true);
            }
        }
    };

    const handleEdit = async () => {
        if (isBeingEditedByOther) {
            alert(`This item is currently being edited by ${editingUser.userName}. Please wait or coordinate with them.`);
            return;
        }

        await setEditingItem(item.id);
        onToggleEdit(item.id);
    };

    if (isEditing) {
        return (
            <RundownItemEditor
                item={item}
                onSave={onSave}
                onCancel={onCancel}
            />
        );
    }

    const itemClasses = `
        group relative 
        ${isDragging ? 'opacity-50' : 'opacity-100'} 
        ${isLocked ? 'opacity-75' : ''} 
        ${isBeingEditedByOther ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
        ${hasConflict ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : ''}
        border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
    `;

    return (
        <div
            ref={ref}
            data-handler-id={handlerId}
            className={itemClasses}
        >
            <div className="grid grid-cols-12 items-center gap-2 px-4 py-1 min-h-[40px]">
                <div className="col-span-1 flex justify-center">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-gray-100 dark:bg-gray-600">
                        {index + 1}
                    </div>
                </div>

                <div className="col-span-5 relative">
                    <h4 className="font-medium truncate text-sm pr-2">
                        {item.title}
                        {isLocked && <CustomIcon name="lock" size={20} className="text-red-500 inline ml-2" />}
                        {hasConflict && (
                            <span className="inline-flex items-center ml-2 px-1 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                                Conflict
                            </span>
                        )}
                    </h4>

                    {/* Show user presence indicator */}
                    {isBeingEditedByOther && (
                        <div className="absolute -bottom-1 left-0">
                            <UserPresenceIndicator itemId={item.id} className="text-xs" />
                        </div>
                    )}
                </div>

                <div className="col-span-2 flex gap-1 justify-start">
                    {(Array.isArray(item.type) ? item.type : [item.type]).map(t => (
                        <span key={t} className={`px-1 py-0.5 rounded text-xs font-bold ${getRundownTypeColor(t)}`}>
                            {t}
                        </span>
                    ))}
                </div>

                <div className="col-span-1">
                    <select
                        value={item.storyStatus || 'Ready for Air'}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={isLocked || isBeingEditedByOther}
                        className={`text-xs p-1 rounded border-none w-full ${getStatusColor(item.storyStatus || 'Ready for Air')} ${(isLocked || isBeingEditedByOther) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={e => e.stopPropagation()}
                        title={isBeingEditedByOther ? `Being edited by ${editingUser.userName}` : ''}
                    >
                        {RUNDOWN_STORY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="col-span-1 text-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{item.duration}</span>
                </div>

                <div className="col-span-2 text-left">
                    {author ? (
                        <span className="text-xs text-gray-500 truncate block" title={author.name}>
                            {author.name.length > 10 ? author.name.substring(0, 10) + '...' : author.name}
                        </span>
                    ) : (
                        <span className="text-xs text-gray-400">No Author</span>
                    )}

                    {/* Version info */}
                    {item.version && (
                        <div className="text-xs text-gray-400">
                            v{item.version}
                        </div>
                    )}
                </div>

                {!isLocked && (
                    <div className="absolute top-1 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {hasConflict && (
                            <button
                                onClick={(e) => { e.stopPropagation(); /* Show conflict resolution modal */ }}
                                className="p-1 text-red-500 hover:text-red-700 rounded"
                                title="Resolve conflict"
                            >
                                <CustomIcon name="notification" size={20} />
                            </button>
                        )}

                        <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                            disabled={isBeingEditedByOther}
                            className={`p-1 rounded ${isBeingEditedByOther ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600'}`}
                            title={isBeingEditedByOther ? `Being edited by ${editingUser.userName}` : 'Edit item'}
                        >
                            <CustomIcon name="edit" size={20} />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                            disabled={isBeingEditedByOther}
                            className={`p-1 rounded ${isBeingEditedByOther ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}
                            title={isBeingEditedByOther ? `Being edited by ${editingUser.userName}` : 'Delete item'}
                        >
                            <CustomIcon name="delete" size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RundownDraggableItem;
