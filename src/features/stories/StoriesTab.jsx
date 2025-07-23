// src/features/stories/StoriesTab.jsx
import React, { useState } from 'react';
import { Plus, Search, Calendar } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getUserPermissions } from '../../lib/permissions';
import { getStatusColor } from '../../utils/styleHelpers';
import StoryCard from './components/StoryCard';
import SendStoryToRundownModal from './components/SendStoryToRundownModal';

const StoriesTab = () => {
    const { currentUser } = useAuth();
    const { appState, setAppState } = useAppContext();
    const [view, setView] = useState('all');
    const [sendToRundownModalStory, setSendToRundownModalStory] = useState(null);

    const userPermissions = getUserPermissions(currentUser.role);

    const filteredStories = appState.stories.filter(story =>
        story.title.toLowerCase().includes(appState.searchTerm.toLowerCase()) ||
        (story.content && story.content.toLowerCase().includes(appState.searchTerm.toLowerCase())) ||
        (story.tags && story.tags.some(tag => tag.toLowerCase().includes(appState.searchTerm.toLowerCase())))
    );

    const myAuthoredStories = filteredStories.filter(story => story.authorId === (currentUser.id || currentUser.uid));
    const myAssignedTasks = appState.assignments.filter(assignment => assignment.assigneeId === (currentUser.id || currentUser.uid));

    const updateSearchTerm = (term) => {
        setAppState(prev => ({ ...prev, searchTerm: term }));
    };

    const openStoryEditor = (story = null) => {
        setAppState(prev => ({
            ...prev,
            modal: {
                type: 'storyEditor',
                story: story
            }
        }));
    };

    const handleDeleteStory = (storyId) => {
        setAppState(prev => ({
            ...prev,
            modal: { type: 'deleteConfirm', id: storyId, itemType: 'stories' }
        }));
    };

    const handleEditStory = (story) => {
        openStoryEditor(story);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-semibold">Stories</h2>
                    <div className="flex rounded-md shadow-sm bg-gray-200 dark:bg-gray-700 p-1">
                        <button
                            onClick={() => setView('all')}
                            className={`px-3 py-1 text-sm rounded-md ${view === 'all'
                                ? 'bg-white dark:bg-gray-900 text-blue-600'
                                : 'text-gray-600 dark:text-gray-300'
                                }`}
                        >
                            All Stories
                        </button>
                        <button
                            onClick={() => setView('mine')}
                            className={`px-3 py-1 text-sm rounded-md ${view === 'mine'
                                ? 'bg-white dark:bg-gray-900 text-blue-600'
                                : 'text-gray-600 dark:text-gray-300'
                                }`}
                        >
                            My Stories
                        </button>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search stories..."
                            value={appState.searchTerm}
                            onChange={(e) => updateSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                        />
                    </div>
                    <button onClick={() => openStoryEditor()} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        <span>New Story</span>
                    </button>
                </div>
            </div>

            {view === 'all' ? (
                <div className="grid gap-4">
                    {filteredStories.map(story => (
                        <StoryCard
                            key={story.id}
                            story={story}
                            onSendToRundown={setSendToRundownModalStory}
                            onDelete={handleDeleteStory}
                            onEdit={handleEditStory}
                            userPermissions={userPermissions}
                            currentUser={currentUser}
                        />
                    ))}
                </div>
            ) : (
                <div>
                    <h3 className="text-lg font-semibold mb-3">My Authored Stories ({myAuthoredStories.length})</h3>
                    {myAuthoredStories.length > 0 ? (
                        <div className="grid gap-4 mb-8">
                            {myAuthoredStories.map(story => (
                                <StoryCard
                                    key={story.id}
                                    story={story}
                                    onSendToRundown={setSendToRundownModalStory}
                                    onDelete={handleDeleteStory}
                                    onEdit={handleEditStory}
                                    userPermissions={userPermissions}
                                    currentUser={currentUser}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">You have not authored any stories.</p>
                    )}

                    <h3 className="text-lg font-semibold mb-3">My Assignments ({myAssignedTasks.length})</h3>
                    {myAssignedTasks.length > 0 ? (
                        <div className="grid gap-4">
                            {myAssignedTasks.map(assignment => (
                                <AssignmentCard key={assignment.id} assignment={assignment} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">You have no pending assignments.</p>
                    )}
                </div>
            )}

            {sendToRundownModalStory && (
                <SendStoryToRundownModal
                    story={sendToRundownModalStory}
                    onCancel={() => setSendToRundownModalStory(null)}
                />
            )}
        </div>
    );
};

const AssignmentCard = ({ assignment }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <div className="flex items-center flex-wrap gap-x-3 mb-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-medium">{assignment.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                    {assignment.status}
                </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm">{assignment.details}</p>
            <div className="flex flex-wrap items-center gap-x-4 text-sm text-gray-500">
                <span>Deadline: {new Date(assignment.deadline).toLocaleString()}</span>
                {assignment.storyId && (
                    <span className="text-blue-500">Linked to story ID: {assignment.storyId}</span>
                )}
            </div>
        </div>
    );
};

export default StoriesTab;
