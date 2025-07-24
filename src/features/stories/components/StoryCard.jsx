import React from 'react';
import CustomIcon from '../../../components/ui/CustomIcon';
import { useAppContext } from '../../../context/AppContext';
import { getStatusColor } from '../../../utils/styleHelpers';
import { getPlatformIcon } from '../../../utils/iconHelpers.jsx';
import CollapsibleVideoSection from './CollapsibleVideoSection';

const StoryCard = ({ story, onSendToRundown, onDelete, onEdit, userPermissions, currentUser }) => {
    const { appState } = useAppContext();

    const getUserById = (id) => appState.users.find(u => u.id === id || u.uid === id);
    const canEdit = userPermissions.canChangeAnyStatus || story.authorId === currentUser.id || story.authorId === currentUser.uid;

    const handleDelete = () => {
        onDelete(story.id);
    };

    const handleEdit = () => {
        onEdit(story);
    };

    return (
        <div className="relative group/storycard">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-3 pr-40">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {getPlatformIcon(story.platform)}
                        <h3 className="text-lg font-medium break-words line-clamp-2">{story.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(story.status)} shrink-0`}>
                            {story.status}
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-500 shrink-0">
                        <CustomIcon name="time" size={40} />
                        <span className="min-w-[50px]">{story.duration}</span>
                    </div>
                </div>

                <div className="mb-4 max-w-full overflow-hidden">
                    <p className="text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap overflow-wrap-anywhere">{story.content}</p>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>By {getUserById(story.authorId)?.name}</span>
                    <span>{new Date(story.created).toLocaleDateString()}</span>
                </div>

                <CollapsibleVideoSection
                    story={story}
                    showControls={canEdit}
                />
            </div>

            <div className="absolute top-4 right-4 opacity-0 group-hover/storycard:opacity-100 transition-opacity flex gap-3">
                {canEdit && (
                    <button
                        onClick={handleEdit}
                        className="btn-secondary !p-3"
                        title="Edit Story"
                    >
                        <CustomIcon name="edit" size={40} />
                    </button>
                )}
                <button
                    onClick={() => onSendToRundown(story)}
                    className="btn-secondary !p-3"
                    title="Send to Rundown"
                >
                    <CustomIcon name="send" size={40} />
                </button>
                {(canEdit || userPermissions.canDeleteAnything) && (
                    <button
                        onClick={handleDelete}
                        className="btn-secondary !p-3"
                        title="Delete Story"
                    >
                        <CustomIcon name="delete" size={40} className="text-red-500" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default StoryCard;
