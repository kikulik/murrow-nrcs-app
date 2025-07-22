// src/features/MurrowNRCS.jsx
import React from 'react';
import { Tv, Bell, LogOut, FileText, PlayCircle, Calendar, Shield, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { getUserPermissions } from '../lib/permissions';
import { useLiveMode } from '../hooks/useLiveMode';
import StoriesTab from './stories/StoriesTab';
import RundownTab from './rundown/RundownTab';
import AssignmentsTab from './assignments/AssignmentsTab';
import AdminTab from './admin/AdminTab.jsx';
import LiveModeTab from './rundown/LiveModeTab';
import Chatbox from '../components/common/Chatbox';
import ModalManager from '../components/common/ModalManager';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


const MurrowNRCS = () => {
    const { currentUser, logout, db } = useAuth();
    const { appState, setAppState } = useAppContext();
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
        { id: 'stories', label: 'Stories', icon: FileText, permission: true },
        { id: 'rundown', label: 'Rundown', icon: PlayCircle, permission: true },
        { id: 'assignments', label: 'Assignments', icon: Calendar, permission: true },
        { id: 'admin', label: 'Admin', icon: Shield, permission: userPermissions.canManageUsers },
        { id: 'live', label: 'Live Mode', icon: Radio, permission: liveMode.isLive },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors">
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Tv className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Murrow</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm hidden sm:inline">
                                Logged in as: <strong>{currentUser.name}</strong> ({currentUser.role})
                            </span>
                            <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400 cursor-pointer" />
                            <button onClick={logout} className="btn-secondary !px-3">
                                <LogOut className="w-4 h-4" />
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
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
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

            <Chatbox
                messages={appState.messages}
                onSendMessage={handleSendMessage}
                currentUser={currentUser}
                getUserById={(id) => appState.users.find(u => u.uid === id)}
            />

            <ModalManager />
        </div>
    );
};

export default MurrowNRCS;
