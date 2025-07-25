// src/features/rundown/components/RundownDraggableItem.jsx
import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import CustomIcon from '../../../components/ui/CustomIcon';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useCollaboration } from '../../../context/CollaborationContext';
import { getStatusColor, getRundownTypeColor } from '../../../utils/styleHelpers';
import { RUNDOWN_STORY_STATUSES } from '../../../lib/constants';
import { getUserPermissions } from '../../../lib/permissions';

const RundownDraggableItem = ({
    item,
    index,
    moveItem,
    canDrag,
    isLocked,
    onDeleteItem,
    isSelected,
    onSelect
}) => {
    const { appState, setQuickEditItem, openStoryTab } = useAppContext(); // ADD openStoryTab
    const { currentUser } = useAuth();
    const {
        safeUpdateRundown,
        getUserEditingItem,
        startEditingStory,
        takeOverStory
    } = useCollaboration();
    const ref = useRef(null);

    const userPermissions = getUserPermissions(currentUser.role);
    const editingUser = getUserEditingItem(item.id);
    const isBeingEditedByOther = editingUser && editingUser.userId !== currentUser.uid;
    const canTakeOver = userPermissions.canTakeOverStories;

    const [{ handlerId }, drop] = useDrop({
        accept: 'rundownItem',
        collect(monitor) {
            return { handlerId: monitor.getHandlerId() };
        },
        hover(draggedItem, monitor) {
            if (!ref.current || isLocked || !userPermissions.canMoveRundownItems) return;
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
        canDrag: canDrag && !isLocked && !isBeingEditedByOther && userPermissions.canMoveRundownItems,
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

    const handleStatusChange = async (newStatus) => {
        if (isLocked || !appState.activeRundownId || isBeingEditedByOther) return;

        try {
            await safeUpdateRundown(appState.activeRundownId, (rundownData) => ({
                ...rundownData,
                items: rundownData.items.map(rundownItem =>
                    rundownItem.id === item.id
                        ? { ...rundownItem, storyStatus: newStatus }
                        : rundownItem
                )
            }));
        } catch (error) {
            console.error("Error updating story status:", error);
        }
    };

    // FIXED: Better edit handler that properly opens collaboration tab
    const handleEdit = async () => {
        console.log('handleEdit called for item:', item.id, item); // DEBUG
        
        if (isBeingEditedByOther && !canTakeOver) {
            alert(`${editingUser.userName} is currently editing this item. You don't have permission to take over.`);
            return;
        }

        try {
            // If someone else is editing and we can take over, ask for confirmation
            if (isBeingEditedByOther && canTakeOver) {
                const confirmed = window.confirm(`${editingUser.userName} is currently editing this story. Do you want to take over? Their progress will be saved.`);
                if (confirmed) {
                    await takeOverStory(item.id, editingUser.userId);
                } else {
                    return;
                }
            }

            // Start editing and open the collaboration tab
            console.log('Calling startEditingStory with:', item.id, item); // DEBUG
            await startEditingStory(item.id, item);
        } catch (error) {
            console.error('Error starting edit:', error);
            alert('Failed to start editing. Please try again.');
        }
    };

    const handleTakeOver = async () => {
        if (!canTakeOver || !editingUser) return;

        const confirmed = window.confirm(`${editingUser.userName} is currently editing this story. Do you want to take over? Their progress will be saved.`);
        if (!confirmed) return;

        const success = await takeOverStory(item.id, editingUser.userId);
        if (success) {
            await startEditingStory(item.id, item);
        } else {
            alert('Failed to take over the story. Please try again.');
        }
    };

    // FIXED: Double click handler that properly opens quick edit
    const handleDoubleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isLocked) {
            alert('Cannot edit items while rundown is live.');
            return;
        }
        
        if (isBeingEditedByOther) {
            alert(`${editingUser.userName} is currently editing this item.`);
            return;
        }
        
        console.log('Double click - opening quick edit for item:', item.id); // DEBUG
        setQuickEditItem(item);
    };

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(item.id, e.ctrlKey || e.metaKey);
    };

    const itemClasses = `
        group relative cursor-pointer
        ${isDragging ? 'opacity-50' : 'opacity-100'} 
        ${isLocked ? 'opacity-75' : ''} 
        ${isSelected ? 'bg-blue-100 dark:bg-blue-800/50 border-l-4 border-blue-500' : ''}
        ${isBeingEditedByOther ? 'bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500' : ''}
        border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
    `;

    return (
        <div
            ref={ref}
            data-handler-id={handlerId}
            className={itemClasses}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            <div className="grid grid-cols-13 items-center gap-2 px-4 py-2 min-h-[44px] relative">
                <div className="col-span-1 flex justify-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-600'}`}>
                        {index + 1}
                    </div>
                </div>
                <div className="col-span-4 overflow-hidden">
                    <h4 className="font-medium text-sm break-words">
                        {item.title}
                        {isLocked && <CustomIcon name="lock" size={16} className="inline ml-2" />}
                    </h4>
                </div>
                <div className="col-span-1 flex justify-center">
                    {isBeingEditedByOther && (
                        <div title={`${editingUser.userName} is editing`} className="w-4 h-4 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                            {editingUser.userName?.charAt(0)}
                        </div>
                    )}
                </div>
                <div className="col-span-2 flex gap-1 flex-wrap">
                    {(Array.isArray(item.type) ? item.type : [item.type]).map(t => (
                        <span key={t} className={`px-1 py-0.5 rounded text-xs font-bold ${getRundownTypeColor(t)}`}>{t}</span>
                    ))}
                </div>
                <div className="col-span-1">
                    <select
                        value={item.storyStatus || 'Ready for Air'}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={isLocked || isBeingEditedByOther}
                        className={`text-xs p-1 rounded border-none w-full ${getStatusColor(item.storyStatus || 'Ready for Air')} ${isLocked || isBeingEditedByOther ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={e => e.stopPropagation()}
                    >
                        {RUNDOWN_STORY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="col-span-1 text-center text-xs text-gray-600 dark:text-gray-400">{item.duration}</div>
                <div className="col-span-2 text-left overflow-hidden text-xs text-gray-500 truncate" title={author?.name}>
                    {author?.name || 'No Author'}
                </div>
                <div className="col-span-1 flex justify-end">
                    {!isLocked && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isBeingEditedByOther && canTakeOver ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleTakeOver(); }}
                                    className="p-1 text-orange-600 hover:text-orange-800 rounded"
                                    title={`Take over from ${editingUser.userName}`}
                                >
                                    <CustomIcon name="user" size={16} />
                                </button>
                            ) : !isBeingEditedByOther && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                    title="Edit item"
                                >
                                    <CustomIcon name="edit" size={16} />
                                </button>
                            )}
                            {userPermissions.canDeleteAnything && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                                    disabled={isBeingEditedByOther}
                                    className={`p-1 rounded transition-colors ${isBeingEditedByOther ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}
                                    title="Delete item"
                                >
                                    <CustomIcon name="delete" size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(RundownDraggableItem);
