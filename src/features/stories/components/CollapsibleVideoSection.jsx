// src/features/stories/components/CollapsibleVideoSection.jsx
// Video section for stories with NLE integration
import React, { useState } from 'react';
import CustomIcon from '../../../components/ui/CustomIcon';

const CollapsibleVideoSection = ({ story, showControls }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!story.mediaId && !story.videoUrl) {
        return null;
    }

    return (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
            >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Video & NLE Details
                </span>
                <div className="flex items-center gap-2">
                    {story.videoUrl && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Video attached"></div>
                    )}
                    {isExpanded ? (
                        <CustomIcon name="close" size={32} className="text-gray-500" />
                    ) : (
                        <CustomIcon name="add story" size={32} className="text-gray-500" />
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-md space-y-3">
                    {story.mediaId && (
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                NLE Export ID
                            </label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono">
                                    {story.mediaId}
                                </code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(story.mediaId)}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    title="Copy to clipboard"
                                >
                                    <CustomIcon name="stories" size={32} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {story.videoUrl ? (
                                <CustomIcon name="add story" size={36} className="text-green-500" />
                            ) : (
                                <CustomIcon name="notification" size={36} className="text-yellow-500" />
                            )}
                            <span className="text-sm">
                                {story.videoUrl ? 'Video file attached' : 'No video file attached'}
                            </span>
                        </div>

                        {showControls && (
                            <button className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                                <CustomIcon name="add story" size={32} />
                                Upload Video
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CollapsibleVideoSection;
