import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import RundownDraggableItem from './RundownDraggableItem';
import CustomIcon from '../../../components/ui/CustomIcon';

const RundownList = ({
    rundown,
    isLocked,
    userPermissions,
    onItemsUpdate,
    selectedItems,
    onSelectionChange
}) => {
    const moveItem = useCallback((dragIndex, hoverIndex) => {
        if (isLocked) return;
        const draggedItem = rundown.items[dragIndex];
        const newItems = [...rundown.items];
        newItems.splice(dragIndex, 1);
        newItems.splice(hoverIndex, 0, draggedItem);
        onItemsUpdate(newItems);
    }, [isLocked, rundown.items, onItemsUpdate]);

    const handleDeleteRundownItem = (itemId) => {
        if (isLocked) return;
        const newItems = rundown.items.filter(item => item.id !== itemId);
        onItemsUpdate(newItems);
    };

    const handleSelect = (itemId, isMultiSelect) => {
        if (isMultiSelect) {
            const newSelection = selectedItems.includes(itemId)
                ? selectedItems.filter(id => id !== itemId)
                : [...selectedItems, itemId];
            onSelectionChange(newSelection);
        } else {
            const newSelection = selectedItems.includes(itemId) && selectedItems.length === 1
                ? []
                : [itemId];
            onSelectionChange(newSelection);
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                <div className="grid grid-cols-13 items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4">Title</div>
                    <div className="col-span-1 text-center">
                        <CustomIcon name="user" size={32} title="User Editing" />
                    </div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-1 text-center">Status</div>
                    <div className="col-span-1 text-center">Duration</div>
                    <div className="col-span-2">Author</div>
                    <div className="col-span-1 text-center">Actions</div>
                </div>

                <div className="divide-y dark:divide-gray-700">
                    {rundown.items?.length > 0 ? (
                        rundown.items.map((item, index) => (
                            <RundownDraggableItem
                                key={item.id}
                                item={item}
                                index={index}
                                moveItem={moveItem}
                                canDrag={userPermissions.canMoveRundownItems}
                                isLocked={isLocked}
                                onDeleteItem={handleDeleteRundownItem}
                                isSelected={selectedItems.includes(item.id)}
                                onSelect={handleSelect}
                            />
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            No items in this rundown. Click "Add Story" to add items.
                        </div>
                    )}
                </div>
            </div>
        </DndProvider>
    );
};

export default RundownList;
