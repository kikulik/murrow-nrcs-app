// src/components/ui/SelectField.jsx
// Reusable select component
import React from 'react';

const SelectField = ({ label, options, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
        </label>
        <select {...props} className="w-full form-input">
            <option value="">-- Select --</option>
            {options.map(opt =>
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            )}
        </select>
    </div>
);

export default SelectField;