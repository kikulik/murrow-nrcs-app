// src/features/rundown/components/RundownDraggableItem.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import CustomIcon from '../../../components/ui/CustomIcon';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useCollaboration } from '../../../context/CollaborationContext';
import { getStatusColor, getRundownTypeColor } from '../../../utils/styleHelpers';
import { RUNDOWN_STORY_STATUSES } from '../../../lib/constants';
import { getUserPermissions } from '../../../lib/permissions';
import RundownItemEditor from './RundownItemEditor';

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
    onDeleteItem,
    isSelected,
    onSelect,
    onTakeOverItem
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
    const [showTakeOver, setShowTakeOver] = useState(false);

    const userPermissions = getUserPermissions(currentUser.role);

    // Sync local state with prop changes
    useEffect(() => {
        setLocalItem(item);
    }, [item]);

    const [{ handlerId }, drop] = useDrop({
        accept: 'rundownItem',
        collect(monitor) {
            return { handlerId: monitor.getHandlerId() };
        },
        hover(draggedItem, monitor) {
            if (!ref.current || isLocked || isEditing || !userPermissions.canMoveRundownItems) return;
            const dragIndex = draggedItem.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = ref.current?.getBoundingRect();
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
        canDrag: canDrag && !isLocked && !isEditing && !isItemBeingEdited(item.id) && userPermissions.canMoveRundownItems,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    if (canDrag && !isLocked && userPermissions.canMoveRundownItems) {
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

    // Stable check for editing user to prevent blinking
    useEffect(() => {
        const isCurrentlyBeingEdited = editingUser && editingUser.userId !== currentUser.uid;
        setShowTakeOver(isCurrentlyBeingEdited && userPermissions.canTakeOverStories);
    }, [editingUser?.userId, currentUser.uid, userPermissions.canTakeOverStories]);

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
        }
    };

    const handleEdit = async () => {
        if (isBeingEditedByOther) {
            const result = confirm(`${editingUser.userName} is currently editing this item. Do you want to take over?`);
            if (result && onTakeOverItem) {
                await onTakeOverItem(item.id, editingUser.userId);
            }
            return;
        }

        await setEditingItem(item.id);
        onToggleEdit(item.id);
    };

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
            onSelect(item.id, true); // Multi-select
        } else {
            onSelect(item.id, false); // Single select
        }
    };

    const handleTakeOver = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (onTakeOverItem && editingUser) {
            await onTakeOverItem(item.id, editingUser.userId);
        }
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
        group relative cursor-pointer
        ${isDragging ? 'opacity-50' : 'opacity-100'} 
        ${isLocked ? 'opacity-75' : ''} 
        ${isSelected ? 'bg-blue-100 dark:bg-blue-800/50 border-l-4 border-blue-500' : ''}
        ${isBeingEditedByOther ? 'bg-orange-50 dark:bg-orange-900/10' : ''}
        border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
    `;

    return (
        <div
            ref={ref}
            data-handler-id={handlerId}
            className={itemClasses}
            onClick={handleClick}
        >
            <div className="grid grid-cols-12 items-center gap-2 px-4 py-3 min-h-[50px] relative">
                <div className="col-span-1 flex justify-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-600'
                        }`}>
                        {index + 1}
                    </div>
                </div>

                <div className="col-span-5 relative pr-4">
                    <h4 className="font-medium truncate text-sm pr-2">
                        {item.title}
                        {isLocked && <CustomIcon name="lock" size={16} className="text-red-500 inline ml-2" />}
                    </h4>

                    {/* Fixed user presence indicator - positioned below title to avoid overlap */}
                    {isBeingEditedByOther && (
                        <div className="absolute -bottom-6 left-0 flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-sm border border-orange-200 dark:border-orange-700 text-xs z-10">
                            <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">
                                {editingUser.userName.charAt(0)}
                            </div>
                            <span className="text-orange-700 dark:text-orange-300 font-medium">
                                {editingUser.userName} editing
                            </span>
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
                        className={`text-xs p-1 rounded border-none w-full ${getStatusColor(item.storyStatus || 'Ready for Air')} ${(isLocked || isBeingEditedByOther) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
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
                </div>

                {/* Fixed action buttons - better positioning and no blinking */}
                {!isLocked && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded shadow-sm border p-1">
                        {showTakeOver ? (
                            <button
                                onClick={handleTakeOver}
                                className="px-2 py-1 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded transition-colors"
                                title={`Take over from ${editingUser?.userName}`}
                            >
                                Take Over
                            </button>
                        ) : (
                            !isBeingEditedByOther && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                    title="Edit item"
                                >
                                    <CustomIcon name="edit" size={16} />
                                </button>
                            )
                        )}

                        {userPermissions.canDeleteAnything && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                                disabled={isBeingEditedByOther}
                                className={`p-1 rounded transition-colors ${isBeingEditedByOther ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'
                                    }`}
                                title={isBeingEditedByOther ? `Being edited by ${editingUser?.userName}` : 'Delete item'}
                            >
                                <CustomIcon name="delete" size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RundownDraggableItem;
