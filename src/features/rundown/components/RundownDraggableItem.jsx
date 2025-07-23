// src/features/rundown/components/RundownDraggableItem.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import CustomIcon from '../../../components/ui/CustomIcon';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { getStatusColor, getRundownTypeColor } from '../../../utils/styleHelpers';
import { RUNDOWN_STORY_STATUSES } from '../../../lib/constants';
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
    onDeleteItem
}) => {
    const { appState } = useAppContext();
    const { db } = useAuth();
    const ref = useRef(null);

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
        canDrag: canDrag && !isLocked && !isEditing,
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

    const handleStatusChange = async (newStatus) => {
        if (isLocked || !db || !appState.activeRundownId) return;

        try {
            const { doc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
            
            const rundownRef = doc(db, "rundowns", appState.activeRundownId);
            const rundownDoc = await getDoc(rundownRef);
            
            if (!rundownDoc.exists()) return;
            
            const rundownData = rundownDoc.data();
            const updatedItems = rundownData.items.map(rundownItem => 
                rundownItem.id === item.id 
                    ? { ...rundownItem, storyStatus: newStatus }
                    : rundownItem
            );
            
            await updateDoc(rundownRef, { items: updatedItems });
        } catch (error) {
            console.error("Error updating story status:", error);
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

    return (
        <div
            ref={ref}
            data-handler-id={handlerId}
            className={`group relative ${isDragging ? 'opacity-50' : 'opacity-100'} ${isLocked ? 'opacity-75' : ''} border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
        >
            <div className="grid grid-cols-12 items-center gap-2 px-4 py-1 min-h-[40px]">
                <div className="col-span-1 flex justify-center">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-gray-100 dark:bg-gray-600">
                        {index + 1}
                    </div>
                </div>

                <div className="col-span-5">
                    <h4 className="font-medium truncate text-sm pr-2">
                        {item.title}
                        {isLocked && <CustomIcon name="lock" size={20} className="text-red-500 inline ml-2" />}
                    </h4>
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
                        disabled={isLocked}
                        className={`text-xs p-1 rounded border-none w-full ${getStatusColor(item.storyStatus || 'Ready for Air')} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={e => e.stopPropagation()}
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

                {!isLocked && (
                    <div className="absolute top-1 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleEdit(item.id); }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        >
                            <CustomIcon name="edit" size={20} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
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
