// src/features/rundown/components/RundownItemEditor.jsx
// Inline editor for rundown items
import React, { useState, useEffect } from 'react';
import InputField from '../../../components/ui/InputField';
import { RUNDOWN_ITEM_TYPES } from '../../../lib/constants';

const RundownItemEditor = ({ item, onSave, onCancel }) => {
    const [formData, setFormData] = useState(item);

    useEffect(() => {
        setFormData(item);
    }, [item]);

    const handleSave = (e) => {
        e.stopPropagation();
        onSave(item.id, formData);
    };

    const handleCancel = (e) => {
        e.stopPropagation();
        onCancel();
    };

    return (
        <div className="p-4 bg-blue-50 dark:bg-gray-700/50 border-l-4 border-blue-500">
            <div className="space-y-4">
                <InputField
                    label="Title"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
                <InputField
                    label="Duration"
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="MM:SS"
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Item Type(s)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.keys(RUNDOWN_ITEM_TYPES).map(abbr => (
                            <label key={abbr} className="flex items-center space-x-2 p-2 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer has-[:checked]:bg-blue-100 dark:has-[:checked]:bg-blue-900/50">
                                <input
                                    type="checkbox"
                                    checked={formData.type.includes(abbr)}
                                    onChange={() => {
                                        const newTypes = formData.type.includes(abbr)
                                            ? formData.type.filter(t => t !== abbr)
                                            : [...formData.type, abbr];
                                        setFormData({ ...formData, type: newTypes });
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm">{abbr}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <textarea
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    rows={5}
                    className="w-full form-input"
                    placeholder="Script or content..."
                />

                <div className="flex justify-end space-x-2">
                    <button onClick={handleCancel} className="btn-secondary">Cancel</button>
                    <button onClick={handleSave} className="btn-primary">Save</button>
                </div>
            </div>
        </div>
    );
};

export default RundownItemEditor;
