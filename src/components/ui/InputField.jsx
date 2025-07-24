// src/components/ui/InputField.jsx
import React from 'react';

const InputField = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
        </label>
        <input {...props} className="w-full form-input" />
    </div>
);

export default InputField;
