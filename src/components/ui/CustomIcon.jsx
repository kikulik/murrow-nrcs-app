// src/components/ui/CustomIcon.jsx
import React from 'react';

const CustomIcon = ({ name, size = 40, className = '', alt = '' }) => {
    const getIconPath = (iconName) => {
        // Assuming icons are in the public folder
        return `/assets/icons/${iconName}.png`;
    };

    const sizeInPixels = `${size}px`;

    return (
        <img
            src={getIconPath(name)}
            alt={alt || name}
            className={className}
            style={{
                width: sizeInPixels,
                height: sizeInPixels,
                objectFit: 'contain',
                display: 'inline-block'
            }}
            onError={(e) => {
                console.log(`Failed to load icon: ${name} from ${e.target.src}`);
                e.target.style.backgroundColor = '#cbd5e1';
                e.target.style.border = '1px solid #94a3b8';
            }}
        />
    );
};

export default CustomIcon;
