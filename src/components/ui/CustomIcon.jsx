// src/components/ui/CustomIcon.jsx
// Custom icon component system for using uploaded PNG icons
import React from 'react';

const CustomIcon = ({ name, size = 20, className = '', alt = '' }) => {
    const getIconPath = (iconName) => {
        return `/public/assets/icons/${iconName}.png`;
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
        />
    );
};

export default CustomIcon;
