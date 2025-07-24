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
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-4 flex-1 min-w-0 pr-4">
                        {getPlatformIcon(story.platform)}
                        <h3 className="text-lg font-medium break-words line-clamp-2 flex-1">{story.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(story.status)} shrink-0`}>
                            {story.status}
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-500 shrink-0 ml-4">
                        <CustomIcon name="time" size={40} />
                        <span className="min-w-[50px] font-medium">{story.duration}</span>
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

                <div className="opacity-0 group-hover/storycard:opacity-100 transition-opacity absolute top-6 right-6 flex gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border">
                    {canEdit && (
                        <button
                            onClick={handleEdit}
                            className="p-2 text-gray-500 hover:text-blue-600 rounded transition-colors"
                            title="Edit Story"
                        >
                            <CustomIcon name="edit" size={32} />
                        </button>
                    )}
                    <button
                        onClick={() => onSendToRundown(story)}
                        className="p-2 text-gray-500 hover:text-green-600 rounded transition-colors"
                        title="Send to Rundown"
                    >
                        <CustomIcon name="send" size={32} />
                    </button>
                    {(canEdit || userPermissions.canDeleteAnything) && (
                        <button
                            onClick={handleDelete}
                            className="p-2 text-gray-500 hover:text-red-600 rounded transition-colors"
                            title="Delete Story"
                        >
                            <CustomIcon name="delete" size={32} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryCard;
