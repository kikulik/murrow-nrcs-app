import React from 'react';
import CustomIcon from '../components/ui/CustomIcon';

export const getPlatformIcon = (platform) => {
    switch (platform) {
        case 'broadcast': return <CustomIcon name="rundown" size={32} />;
        case 'web': return <CustomIcon name="story" size={32} />;
        case 'social': return <CustomIcon name="chat" size={32} />;
        default: return <CustomIcon name="stories" size={32} />;
    }
};
