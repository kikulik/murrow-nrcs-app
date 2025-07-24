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
    const [showTakeOverConfirm, setShowTakeOverConfirm] = useState(false);

    const userPermissions = getUserPermissions(currentUser.role);

    useEffect(() => {
        setLocalItem(item);
    }, [item]);

    useEffect(() => {
        const handleForcedTakeOver = (event) => {
            if (event.detail.itemId === item.id && isEditing) {
                onSave(item.id, localItem);
                onCancel();
            }
        };

        window.addEventListener('forcedTakeOver', handleForcedTakeOver);
        return () => {
            window.removeEventListener('forcedTakeOver', handleForcedTakeOver);
        };
    }, [item.id, isEditing, localItem, onSave, onCancel]);

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
            if (userPermissions.canTakeOverStories) {
                setShowTakeOverConfirm(true);
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
            onSelect(item.id, true);
        } else {
            onSelect(item.id, false);
        }
    };

    const handleConfirmTakeOver = async () => {
        if (onTakeOverItem && editingUser && userPermissions.canTakeOverStories) {
            const success = await onTakeOverItem(item.id, editingUser.userId);
            if (success) {
                setShowTakeOverConfirm(false);
                setTimeout(() => {
                    onToggleEdit(item.id);
                }, 500);
            }
        }
    };

    const handleCancelTakeOver = () => {
        setShowTakeOverConfirm(false);
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
        <>
            <div
                ref={ref}
                data-handler-id={handlerId}
                className={itemClasses}
                onClick={handleClick}
            >
                <div className="grid grid-cols-13 items-center gap-2 px-4 py-2 min-h-[44px] relative">
                    <div className="col-span-1 flex justify-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-600'
                            }`}>
                            {index + 1}
                        </div>
                    </div>

                    <div className="col-span-4 overflow-hidden">
                        <h4 className="font-medium text-sm break-words overflow-wrap-anywhere">
                            {item.title}
                            {isLocked && <CustomIcon name="lock" size={32} className="text-red-500 inline ml-2" />}
                        </h4>
                    </div>

                    <div className="col-span-1 flex justify-center">
                        {isBeingEditedByOther ? (
                            <div className="flex items-center justify-center">
                                <div
                                    className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold animate-pulse"
                                    title={`${editingUser.userName} is editing`}
                                >
                                    {editingUser.userName.charAt(0)}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="col-span-2 flex gap-1 justify-start flex-wrap">
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

                    <div className="col-span-2 text-left overflow-hidden">
                        {author ? (
                            <span className="text-xs text-gray-500 truncate block" title={author.name}>
                                {author.name.length > 10 ? author.name.substring(0, 10) + '...' : author.name}
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400">No Author</span>
                        )}
                    </div>

                    <div className="col-span-1 flex justify-end">
                        {!isLocked && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!isBeingEditedByOther && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                                        className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                        title="Edit item"
                                    >
                                        <CustomIcon name="edit" size={32} />
                                    </button>
                                )}

                                {userPermissions.canDeleteAnything && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                                        disabled={isBeingEditedByOther}
                                        className={`p-1 rounded transition-colors ${isBeingEditedByOther ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'
                                            }`}
                                        title={isBeingEditedByOther ? `Being edited by ${editingUser.userName}` : 'Delete item'}
                                    >
                                        <CustomIcon name="delete" size={32} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showTakeOverConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <CustomIcon name="notification" size={40} className="text-orange-500" />
                            <h3 className="text-lg font-semibold">Take Over Editing</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {editingUser?.userName} is currently editing this item. Taking over will save their work and close their editor. Do you want to continue?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleCancelTakeOver}
                                className="btn-secondary"
                            >
                                <CustomIcon name="cancel" size={32} />
                                <span>Cancel</span>
                            </button>
                            <button
                                onClick={handleConfirmTakeOver}
                                className="btn-primary bg-orange-600 hover:bg-orange-700"
                            >
                                <CustomIcon name="lock" size={32} />
                                <span>Take Over</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default React.memo(RundownDraggableItem);
