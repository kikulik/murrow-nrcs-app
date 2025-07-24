// src/features/rundown/components/RundownList.jsx
import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import RundownDraggableItem from './RundownDraggableItem';

const RundownList = ({
    rundown,
    isLocked,
    userPermissions,
    onItemsUpdate,
    selectedItems,
    onSelectionChange,
    onTakeOverItem
}) => {
    const [editingId, setEditingId] = useState(null);

    const moveItem = useCallback((dragIndex, hoverIndex) => {
        if (isLocked) return;
        const draggedItem = rundown.items[dragIndex];
        const newItems = [...rundown.items];
        newItems.splice(dragIndex, 1);
        newItems.splice(hoverIndex, 0, draggedItem);
        onItemsUpdate(newItems);
    }, [isLocked, rundown.items, onItemsUpdate]);

    const handleSaveItem = (itemId, updatedData) => {
        const newItems = rundown.items.map(item => (item.id === itemId ? updatedData : item));
        onItemsUpdate(newItems);
        setEditingId(null);
    };

    const handleDeleteRundownItem = (itemId) => {
        if (isLocked) return;
        const newItems = rundown.items.filter(item => item.id !== itemId);
        onItemsUpdate(newItems);
    };

    const handleSelect = (itemId, isMultiSelect) => {
        if (isMultiSelect) {
            // Multi-select with Ctrl/Cmd
            const newSelection = selectedItems.includes(itemId)
                ? selectedItems.filter(id => id !== itemId)
                : [...selectedItems, itemId];
            onSelectionChange(newSelection);
        } else {
            // Single select
            const newSelection = selectedItems.includes(itemId) && selectedItems.length === 1
                ? []
                : [itemId];
            onSelectionChange(newSelection);
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
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
                                isEditing={editingId === item.id}
                                onToggleEdit={() => setEditingId(item.id)}
                                onSave={handleSaveItem}
                                onCancel={() => setEditingId(null)}
                                onDeleteItem={handleDeleteRundownItem}
                                isSelected={selectedItems.includes(item.id)}
                                onSelect={handleSelect}
                                onTakeOverItem={onTakeOverItem}
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
