// src/features/stories/components/StoryCard.jsx
import React from 'react';
import { Send, Trash2, Clock } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { getStatusColor } from '../../../utils/styleHelpers';
import { getPlatformIcon } from '../../../utils/iconHelpers.jsx';
import CollapsibleVideoSection from './CollapsibleVideoSection';

const StoryCard = ({ story, onSendToRundown, onDelete, userPermissions, currentUser }) => {
    const { appState } = useAppContext();

    const getUserById = (id) => appState.users.find(u => u.id === id || u.uid === id);
    const canEdit = userPermissions.canChangeAnyStatus || story.authorId === currentUser.id || story.authorId === currentUser.uid;

    const handleDelete = () => {
        onDelete(story.id);
    };

    return (
        <div className="relative group/storycard">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-3 pr-20">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {getPlatformIcon(story.platform)}
                        <h3 className="text-lg font-medium truncate">{story.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(story.status)} shrink-0`}>
                            {story.status}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 shrink-0">
                        <Clock className="w-4 h-4" />
                        <span>{story.duration}</span>
                    </div>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">{story.content}</p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>By {getUserById(story.authorId)?.name}</span>
                    <span>{new Date(story.created).toLocaleDateString()}</span>
                </div>

                <CollapsibleVideoSection
                    story={story}
                    showControls={canEdit}
                />
            </div>

            <div className="absolute top-4 right-4 opacity-0 group-hover/storycard:opacity-100 transition-opacity flex gap-2">
                <button
                    onClick={() => onSendToRundown(story)}
                    className="btn-secondary !p-2"
                    title="Send to Rundown"
                >
                    <Send className="w-4 h-4" />
                </button>
                {(canEdit || userPermissions.canDeleteAnything) && (
                    <button
                        onClick={handleDelete}
                        className="btn-secondary !p-2"
                        title="Delete Story"
                    >
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default StoryCard;
