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
    parseFolderPath
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

        // Also include folders that were created but are empty
        (appState.createdFolders || []).forEach(folderPath => {
            const { dateFolder, subFolder } = parseFolderPath(folderPath);
            if (!folderMap.has(dateFolder)) {
                folderMap.set(dateFolder, new Set());
            }
            if (subFolder) {
                folderMap.get(dateFolder).add(subFolder);
            }
        });

        // Ensure current date folder exists
        const currentDate = generateDateFolder();
        if (!folderMap.has(currentDate)) {
            folderMap.set(currentDate, new Set());
        }

        const allDates = sortFoldersByDate(Array.from(folderMap.keys()));

        return allDates.map(dateFolder => ({
            dateFolder,
            subFolders: Array.from(folderMap.get(dateFolder) || []).sort(),
            stories: getStoriesInFolder(appState.stories, dateFolder)
        }));
    }, [appState.stories, appState.createdFolders]);

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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
                <div className="p-3 border-b bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                    <h3 className="font-medium text-sm flex items-center gap-2">
                        <CustomIcon name="stories" size={16} />
                        Story Folders
                    </h3>
                    <button
                        onClick={() => setShowCreateFolder(true)}
                        className="p-1 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="Create new folder"
                    >
                        <CustomIcon name="add story" size={16} />
                    </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {/* All Stories option */}
                    <div
                        className={`flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${selectedFolder === '' ? 'bg-blue-100 dark:bg-blue-900 border-r-2 border-blue-500' : ''
                            }`}
                        onClick={() => selectFolder('')}
                    >
                        <div className="w-4 mr-2"></div>
                        <CustomIcon name="stories" size={16} className="mr-2 text-blue-600" />
                        <span className="text-sm font-medium">All Stories ({appState.stories.length})</span>
                    </div>

                    {folderStructure.map(({ dateFolder, subFolders, stories }) => (
                        <div key={dateFolder}>
                            {/* Date folder */}
                            <div
                                className={`flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedFolder === dateFolder ? 'bg-blue-100 dark:bg-blue-900 border-r-2 border-blue-500' : ''
                                    }`}
                            >
                                <button
                                    onClick={() => toggleFolder(dateFolder)}
                                    className="w-4 h-4 mr-2 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                >
                                    <CustomIcon name={expandedFolders.has(dateFolder) ? "chevron-down" : "chevron-right"} size={12} />
                                </button>
                                <div
                                    className="flex items-center flex-1 cursor-pointer"
                                    onClick={() => selectFolder(dateFolder)}
                                >
                                    <CustomIcon name="time" size={16} className="mr-2 text-orange-600" />
                                    <span className="text-sm">{dateFolder}</span>
                                    <span className="ml-auto text-xs text-gray-500">({stories.length})</span>
                                </div>
                            </div>

                            {/* Subfolders */}
                            {expandedFolders.has(dateFolder) && subFolders.map(subFolder => {
                                const fullPath = createStoryFolder(dateFolder, subFolder);
                                const subFolderStories = getStoriesInFolder(appState.stories, fullPath);

                                return (
                                    <div
                                        key={fullPath}
                                        className={`flex items-center px-3 py-2 pl-8 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${selectedFolder === fullPath ? 'bg-blue-100 dark:bg-blue-900 border-r-2 border-blue-500' : ''
                                            }`}
                                        onClick={() => selectFolder(fullPath)}
                                    >
                                        <div className="w-4 mr-2"></div>
                                        <CustomIcon name="add story" size={16} className="mr-2 text-green-600" />
                                        <span className="text-sm">{subFolder}</span>
                                        <span className="ml-auto text-xs text-gray-500">({subFolderStories.length})</span>
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
                        <CustomIcon name="search" size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search stories..."
                            value={appState.searchTerm}
                            onChange={(e) => updateSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm w-64"
                        />
                    </div>
                    <button onClick={() => openStoryEditor()} className="btn-primary">
                        <CustomIcon name="add story" size={20} />
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
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CustomIcon name="add story" size={16} className="text-blue-600" />
                                    <span className="font-medium text-blue-800 dark:text-blue-200">
                                        Viewing: {selectedFolder}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedFolder('')}
                                    className="text-blue-600 hover:text-blue-700 text-sm hover:underline"
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
                <CustomIcon name="assignments" size={24} className="text-purple-500" />
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
