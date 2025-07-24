// src/features/MurrowNRCS.jsx
import React, { useState, useEffect } from 'react';
import CustomIcon from '../components/ui/CustomIcon';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { useCollaboration } from '../context/CollaborationContext';
import { getUserPermissions } from '../lib/permissions';
import { useLiveMode } from '../hooks/useLiveMode';
import StoriesTab from './stories/StoriesTab';
import RundownTab from './rundown/RundownTab';
import AssignmentsTab from './assignments/AssignmentsTab';
import AdminTab from './admin/AdminTab.jsx';
import LiveModeTab from './rundown/LiveModeTab';
import Chatbox from '../components/common/Chatbox';
import ModalManager from '../components/common/ModalManager';
import { ActiveUsersPanel } from '../components/collaboration/UserPresenceIndicator';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const MurrowNRCS = () => {
    const { currentUser, logout, db } = useAuth();
    const { appState, setAppState } = useAppContext();
    const { activeUsers } = useCollaboration();

    const userPermissions = getUserPermissions(currentUser.role);

    const activeRundown = appState.rundowns.find(r => r.id === appState.activeRundownId);
    const liveMode = useLiveMode(activeRundown, appState.activeRundownId);

    const handleSendMessage = async (text) => {
        if (!db || !currentUser) return;
        try {
            const newMessage = {
                userId: currentUser.uid,
                userName: currentUser.name,
                text,
                timestamp: new Date().toISOString()
            };
            await addDoc(collection(db, "messages"), newMessage);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const setActiveTab = (tab) => {
        if (liveMode.isLive && tab !== 'live') {
            setAppState(prev => ({ ...prev, activeTab: 'live' }));
        } else {
            setAppState(prev => ({ ...prev, activeTab: tab }));
        }
    };

    const tabs = [
        { id: 'stories', label: 'Stories', icon: 'stories', permission: true },
        { id: 'rundown', label: 'Rundown', icon: 'rundown', permission: true },
        { id: 'assignments', label: 'Assignments', icon: 'assignments', permission: userPermissions.canCreateAssignments || appState.assignments.some(a => a.assigneeId === currentUser.uid) },
        { id: 'admin', label: 'Admin', icon: 'admin', permission: userPermissions.canManageUsers },
        { id: 'live', label: 'Live Mode', icon: 'golive', permission: liveMode.isLive },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors">
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <div className="w-20 h-20 flex items-center justify-center">
                                <CustomIcon name="logo" size={90} />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Murrow</h1>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Collaboration indicator */}
                            {activeUsers.length > 0 && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex -space-x-1">
                                        {activeUsers.slice(0, 3).map(user => (
                                            <div
                                                key={user.id}
                                                className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                                                title={user.userName}
                                            >
                                                {user.userName.charAt(0)}
                                            </div>
                                        ))}
                                    </div>
                                    {activeUsers.length > 3 && (
                                        <span className="text-xs">+{activeUsers.length - 3} more</span>
                                    )}
                                    <span className="text-xs">online</span>
                                </div>
                            )}

                            <span className="text-sm hidden sm:inline">
                                Logged in as: <strong>{currentUser.name}</strong> ({currentUser.role})
                            </span>
                            <CustomIcon name="notification" size={36} className="text-gray-500 dark:text-gray-400 cursor-pointer" />
                            <button onClick={logout} className="btn-secondary !px-3">
                                <CustomIcon name="logout" size={32} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <nav className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        {tabs.map(tab => (
                            tab.permission && (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${appState.activeTab === tab.id
                                        ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <CustomIcon name={tab.icon} size={32} />
                                    <span>{tab.label}</span>
                                </button>
                            )
                        ))}
                    </div>
                </div>
            </nav>

            <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {appState.activeTab === 'stories' && <StoriesTab />}
                {appState.activeTab === 'rundown' && <RundownTab liveMode={liveMode} />}
                {appState.activeTab === 'assignments' && <AssignmentsTab />}
                {appState.activeTab === 'admin' && <AdminTab />}
                {appState.activeTab === 'live' && activeRundown && <LiveModeTab liveMode={liveMode} />}
            </main>

            {/* Active users panel */}
            <ActiveUsersPanel />

            {/* Chat component with sky blue theme */}
            <Chatbox
                messages={appState.messages}
                onSendMessage={handleSendMessage}
                currentUser={currentUser}
                getUserById={(id) => appState.users.find(u => u.uid === id)}
            />

            {/* Modal manager */}
            <ModalManager />
        </div>
    );
};

export default MurrowNRCS;
