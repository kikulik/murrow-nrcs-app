// src/features/admin/AdminTab.jsx
import React, { useState } from 'react';
import { UserPlus, Plus, FilePlus, Edit3, Trash2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getUserPermissions } from '../../lib/permissions';
import UserEditor from './components/UserEditor';
import GroupEditor from './components/GroupEditor';
import TemplateEditor from './components/TemplateEditor';
import { doc, updateDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const AdminTab = () => {
    const { currentUser, db, register } = useAuth();
    const { appState, setAppState } = useAppContext();
    const [editingTarget, setEditingTarget] = useState(null);
    const [isCreating, setIsCreating] = useState(null);

    const userPermissions = getUserPermissions(currentUser.role);
    const getGroupById = (id) => appState.groups.find(g => g.id === id);

    const handleSaveItem = async (item, type) => {
        if (!db) return;
        const collectionName = type === 'user' ? 'users' : type === 'group' ? 'groups' : 'rundownTemplates';

        try {
            if (item.id) {
                // Editing existing item
                const docRef = doc(db, collectionName, item.id);
                const { id, ...dataToUpdate } = item;
                await updateDoc(docRef, dataToUpdate);
            } else {
                // Creating new item
                if (type === 'user' && item.password) {
                    // Special handling for new user registration
                    await register(item.email, item.password, item.name, item.role);
                } else {
                    await addDoc(collection(db, collectionName), item);
                }
            }
        } catch (error) {
            console.error(`Error saving ${type}:`, error);
        } finally {
            setEditingTarget(null);
            setIsCreating(null);
        }
    };

    const handleCancel = () => {
        setEditingTarget(null);
        setIsCreating(null);
    };

    const handleDelete = (id, type) => {
        const collectionName = type === 'user' ? 'users' : type === 'group' ? 'groups' : 'rundownTemplates';
        setAppState(prev => ({
            ...prev,
            modal: { type: 'deleteConfirm', id, itemType: collectionName }
        }));
    };

    const renderUserRow = (user) => {
        if (editingTarget?.type === 'user' && editingTarget.id === user.id) {
            return (
                <UserEditor
                    key={user.id}
                    user={user}
                    onSave={(item) => handleSaveItem(item, 'user')}
                    onCancel={handleCancel}
                />
            );
        }

        return (
            <div key={user.id} className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded">
                <div>
                    <span className="font-medium">{user.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                        ({user.role} / {getGroupById(user.groupId)?.name || 'No Group'})
                    </span>
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => setEditingTarget({ type: 'user', id: user.id })}
                        className="p-2 text-gray-500 hover:text-blue-600 rounded"
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(user.id, 'user')}
                        className="p-2 text-gray-500 hover:text-red-600 rounded"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    const renderGroupRow = (group) => {
        if (editingTarget?.type === 'group' && editingTarget.id === group.id) {
            return (
                <GroupEditor
                    key={group.id}
                    group={group}
                    onSave={(item) => handleSaveItem(item, 'group')}
                    onCancel={handleCancel}
                />
            );
        }

        return (
            <div key={group.id} className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded">
                <span className="font-medium">{group.name}</span>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => setEditingTarget({ type: 'group', id: group.id })}
                        className="p-2 text-gray-500 hover:text-blue-600 rounded"
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(group.id, 'group')}
                        className="p-2 text-gray-500 hover:text-red-600 rounded"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    const renderTemplateRow = (template) => {
        if (editingTarget?.type === 'template' && editingTarget.id === template.id) {
            return (
                <TemplateEditor
                    key={template.id}
                    template={template}
                    onSave={(item) => handleSaveItem(item, 'rundownTemplate')}
                    onCancel={handleCancel}
                />
            );
        }

        return (
            <div key={template.id} className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded">
                <span className="font-medium">{template.name}</span>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => setEditingTarget({ type: 'template', id: template.id })}
                        className="p-2 text-gray-500 hover:text-blue-600 rounded"
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(template.id, 'rundownTemplate')}
                        className="p-2 text-gray-500 hover:text-red-600 rounded"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Users</h2>
                    <button onClick={() => setIsCreating('user')} className="btn-primary text-sm">
                        <UserPlus className="w-4 h-4" />
                        <span>Add User</span>
                    </button>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 space-y-2">
                    {isCreating === 'user' && (
                        <UserEditor
                            user={null}
                            onSave={(item) => handleSaveItem(item, 'user')}
                            onCancel={handleCancel}
                        />
                    )}
                    {appState.users.map(renderUserRow)}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Groups</h2>
                    <button onClick={() => setIsCreating('group')} className="btn-primary text-sm">
                        <Plus className="w-4 h-4" />
                        <span>Add Group</span>
                    </button>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 space-y-2">
                    {isCreating === 'group' && (
                        <GroupEditor
                            group={null}
                            onSave={(item) => handleSaveItem(item, 'group')}
                            onCancel={handleCancel}
                        />
                    )}
                    {appState.groups.map(renderGroupRow)}
                </div>
            </div>

            {userPermissions.canManageTemplates && (
                <div className="space-y-4 lg:col-span-2">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Rundown Templates</h2>
                        <button onClick={() => setIsCreating('template')} className="btn-primary text-sm">
                            <FilePlus className="w-4 h-4" />
                            <span>New Template</span>
                        </button>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 space-y-2">
                        {isCreating === 'template' && (
                            <TemplateEditor
                                template={null}
                                onSave={(item) => handleSaveItem(item, 'rundownTemplate')}
                                onCancel={handleCancel}
                            />
                        )}
                        {appState.rundownTemplates.map(renderTemplateRow)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTab;
