import React from 'react';
import CustomIcon from '../components/ui/CustomIcon';

export const getPlatformIcon = (platform) => {
    switch (platform) {
        case 'broadcast': return <CustomIcon name="rundown" size={16} />;
        case 'web': return <CustomIcon name="story" size={16} />;
        case 'social': return <CustomIcon name="chat" size={16} />;
        default: return <CustomIcon name="stories" size={16} />;
    }
};
