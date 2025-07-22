// src/features/rundown/components/RundownList.jsx
// Rundown items list with drag and drop
import React, { useState, useCallback } from 'react';
import { ListPlus } from 'lucide-react';
import RundownDraggableItem from './RundownDraggableItem';

const RundownList = ({ rundown, isLocked, onAddStory, userPermissions }) => {
    const [editingId, setEditingId] = useState(null);

    const moveItem = useCallback((dragIndex, hoverIndex) => {
        if (isLocked) return;
        // Implementation for moving items
    }, [isLocked]);

    const handleSaveItem = (itemId, updatedData) => {
        // Implementation for saving item
        setEditingId(null);
    };

    const handleDeleteRundownItem = (itemId) => {
        if (isLocked) return;
        // Implementation for deleting item
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
            <div className="p-4 border-b flex justify-end">
                <button
                    onClick={onAddStory}
                    disabled={isLocked}
                    className={`btn-primary ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <ListPlus className="w-4 h-4" />
                    <span>Add Item</span>
                </button>
            </div>
            <div className="divide-y dark:divide-gray-700">
                {rundown.items?.map((item, index) => (
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
                    />
                ))}
            </div>
        </div>
    );
};

export default RundownList;