// src/features/admin/components/TemplateEditor.jsx
// Rundown template editor component
import React, { useState } from 'react';
import CustomIcon from '../../../components/ui/CustomIcon';
import InputField from '../../../components/ui/InputField';
import { RUNDOWN_ITEM_TYPES } from '../../../lib/constants';

const TemplateEditor = ({ template, onSave, onCancel }) => {
    const [name, setName] = useState(template?.name || '');
    const [items, setItems] = useState(template?.items || []);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, {
            id: Date.now(),
            title: 'New Item',
            duration: '01:00',
            type: ['STD'],
            content: ''
        }]);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...template, name, items });
    };

    return (
        <div className="bg-blue-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-blue-500 p-6 my-4 col-span-full">
            <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="text-lg font-semibold">
                    {template ? 'Edit Template' : 'Create New Template'}
                </h3>

                <InputField
                    label="Template Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />

                <div>
                    <h4 className="text-md font-medium mb-2">Template Items</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto p-2 border rounded-md bg-white dark:bg-gray-800">
                        {items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                <div className="col-span-5">
                                    <input
                                        type="text"
                                        value={item.title}
                                        onChange={e => handleItemChange(index, 'title', e.target.value)}
                                        className="form-input w-full"
                                        placeholder="Item Title"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input
                                        type="text"
                                        value={item.duration}
                                        onChange={e => handleItemChange(index, 'duration', e.target.value)}
                                        className="form-input w-full"
                                        placeholder="MM:SS"
                                    />
                                </div>
                                <div className="col-span-4">
                                    <select
                                        value={item.type[0]}
                                        onChange={e => handleItemChange(index, 'type', [e.target.value])}
                                        className="form-input w-full"
                                    >
                                        {Object.entries(RUNDOWN_ITEM_TYPES).map(([abbr, name]) =>
                                            <option key={abbr} value={abbr}>{name}</option>
                                        )}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-2 text-red-500 hover:text-red-700"
                                    >
                                        <CustomIcon name="cancel" size={32} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={addItem} className="btn-secondary mt-3 text-sm">
                        <CustomIcon name="add story" size={32} />
                        Add Item
                    </button>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">
                        <CustomIcon name="save" size={32} />
                        <span>Save Template</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TemplateEditor;
