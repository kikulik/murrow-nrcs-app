// src/components/ui/CustomIcon.jsx
// Custom icon component system for using uploaded PNG icons
import React from 'react';

const CustomIcon = ({ name, size = 20, className = '', alt = '' }) => {
    const getIconPath = (iconName) => {
        // Files in public folder are served from root, so NO '/public/' prefix needed
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
                // Fallback to a simple colored square if icon fails to load
                e.target.style.backgroundColor = '#cbd5e1';
                e.target.style.border = '1px solid #94a3b8';
            }}
        />
    );
};

export default CustomIcon;
