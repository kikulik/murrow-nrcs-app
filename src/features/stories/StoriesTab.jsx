// src/features/stories/StoriesTab.jsx
import React, { useState, useMemo } from 'react';
import CustomIcon from '../../components/ui/CustomIcon';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getUserPermissions } from '../../lib/permissions';
import { getStatusColor } from '../../utils/styleHelpers';
import {
    getFoldersByDate,
    getStoriesInFolder,
    sortFoldersByDate,
    generateDateFolder,
    createStoryFolder,
    validateFolderName,
    sanitizeFolderName
} from '../../utils/folderHelpers';
import StoryCard from './components/StoryCard';
import SendStoryToRundownModal from './components/SendStoryToRundownModal';
import CreateFolderModal from './components/CreateFolderModal';

const StoriesTab = () => {
    const { currentUser } = useAuth();
    const { appState, setAppState } = useAppContext();
    const [view, setView] = useState('all');
    const [sendToRundownModalStory, setSendToRundownModalStory] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState('');
    const [expandedFolders, setExpandedFolders] = useState(new Set([generateDateFolder()]));
    const [showCreateFolder, setShowCreateFolder] = useState(false);

    const userPermissions = getUserPermissions(currentUser.role);

    // Organize stories by folders
    const folderStructure = useMemo(() => {
        const folderMap = getFoldersByDate(appState.stories);
        const sortedDates = sortFoldersByDate(folderMap.keys());

        // Add current date if no stories exist yet
        if (!folderMap.has(generateDateFolder())) {
            folderMap.set(generateDateFolder(), new Set());
        }

        return sortedDates.concat([generateDateFolder()]).filter((date, index, arr) => arr.indexOf(date) === index).map(dateFolder => ({
            dateFolder,
            subFolders: Array.from(folderMap.get(dateFolder) || []).sort(),
            stories: getStoriesInFolder(appState.stories, dateFolder)
        }));
    }, [appState.stories]);

    // Filter stories based on search and selected folder
    const filteredStories = useMemo(() => {
        let stories = appState.stories;

        // Filter by search term
        if (appState.searchTerm) {
            stories = stories.filter(story =>
                story.title.toLowerCase().includes(appState.searchTerm.toLowerCase()) ||
                (story.content && story.content.toLowerCase().includes(appState.searchTerm.toLowerCase())) ||
                (story.tags && story.tags.some(tag => tag.toLowerCase().includes(appState.searchTerm.toLowerCase())))
            );
        }

        // Filter by selected folder
        if (selectedFolder) {
            stories = stories.filter(story => story.folder === selectedFolder);
        }

        return stories;
    }, [appState.stories, appState.searchTerm, selectedFolder]);

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
                story: story,
                defaultFolder: selectedFolder || generateDateFolder()
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

    const toggleFolder = (folderPath) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderPath)) {
                newSet.delete(folderPath);
            } else {
                newSet.add(folderPath);
            }
            return newSet;
        });
    };

    const selectFolder = (folderPath) => {
        setSelectedFolder(selectedFolder === folderPath ? '' : folderPath);
    };

    const renderFolderTree = () => {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm">Story Folders</h3>
                    <button
                        onClick={() => setShowCreateFolder(true)}
                        className="p-1 text-gray-500 hover:text-blue-600 rounded"
                        title="Create new folder"
                    >
                        <CustomIcon name="add story" size={16} />
                    </button>
                </div>

                <div className="space-y-0.5 text-sm">
                    {/* All Stories option */}
                    <div className="flex items-center">
                        <div className="w-4"></div>
                        <button
                            onClick={() => selectFolder('')}
                            className={`flex-1 text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1 ${selectedFolder === '' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
                                }`}
                        >
                            <span>📁</span>
                            <span>All Stories ({appState.stories.length})</span>
                        </button>
                    </div>

                    {folderStructure.map(({ dateFolder, subFolders, stories }) => (
                        <div key={dateFolder}>
                            {/* Date folder */}
                            <div className="flex items-center">
                                <button
                                    onClick={() => toggleFolder(dateFolder)}
                                    className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                >
                                    {expandedFolders.has(dateFolder) ? (
                                        <span className="text-xs">▼</span>
                                    ) : (
                                        <span className="text-xs">▶</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => selectFolder(dateFolder)}
                                    className={`flex-1 text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1 ${selectedFolder === dateFolder ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
                                        }`}
                                >
                                    <span>📅</span>
                                    <span>{dateFolder} ({stories.length})</span>
                                </button>
                            </div>

                            {/* Subfolders */}
                            {expandedFolders.has(dateFolder) && subFolders.map(subFolder => {
                                const fullPath = createStoryFolder(dateFolder, subFolder);
                                const subFolderStories = getStoriesInFolder(appState.stories, fullPath);

                                return (
                                    <div key={fullPath} className="flex items-center ml-4">
                                        <div className="w-4"></div>
                                        <button
                                            onClick={() => selectFolder(fullPath)}
                                            className={`flex-1 text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1 ${selectedFolder === fullPath ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
                                                }`}
                                        >
                                            <span>📂</span>
                                            <span>{subFolder} ({subFolderStories.length})</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
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
                        <CustomIcon name="search" size={32} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search stories..."
                            value={appState.searchTerm}
                            onChange={(e) => updateSearchTerm(e.target.value)}
                            className="pl-16 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                        />
                    </div>
                    <button onClick={() => openStoryEditor()} className="btn-primary">
                        <CustomIcon name="add story" size={32} />
                        <span>New Story</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Folder sidebar */}
                <div className="lg:col-span-1">
                    {renderFolderTree()}
                </div>

                {/* Stories content */}
                <div className="lg:col-span-3">
                    {selectedFolder && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Viewing: {selectedFolder}</span>
                                <button
                                    onClick={() => setSelectedFolder('')}
                                    className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                    Clear filter
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'all' ? (
                        <div className="space-y-4">
                            {filteredStories.length > 0 ? (
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
                                <div className="text-center py-12 text-gray-500">
                                    {appState.searchTerm || selectedFolder
                                        ? 'No stories found matching your criteria.'
                                        : 'No stories yet. Create your first story!'
                                    }
                                </div>
                            )}
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
                </div>
            </div>

            {sendToRundownModalStory && (
                <SendStoryToRundownModal
                    story={sendToRundownModalStory}
                    onCancel={() => setSendToRundownModalStory(null)}
                />
            )}

            {showCreateFolder && (
                <CreateFolderModal
                    onCancel={() => setShowCreateFolder(false)}
                />
            )}
        </div>
    );
};

const AssignmentCard = ({ assignment }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <div className="flex items-center flex-wrap gap-x-3 mb-2">
                <CustomIcon name="assignments" size={32} className="text-purple-500" />
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
