import React from 'react';
import { Tv, Globe, MessageSquare, FileText } from 'lucide-react';

export const getPlatformIcon = (platform) => {
    switch (platform) {
        case 'broadcast': return <Tv className="w-4 h-4" />;
        case 'web': return <Globe className="w-4 h-4" />;
        case 'social': return <MessageSquare className="w-4 h-4" />;
        default: return <FileText className="w-4 h-4" />;
    }
};