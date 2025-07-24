// src/components/common/Chatbox.jsx
// Team chat component with sky blue theme
import React, { useState, useRef, useEffect } from 'react';
import CustomIcon from '../ui/CustomIcon';

const Chatbox = ({ messages, onSendMessage, currentUser, getUserById }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage.trim());
            setNewMessage("");
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {isOpen ? (
                <div className="w-96 h-[500px] bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900 dark:to-blue-900 rounded-lg shadow-2xl flex flex-col border border-sky-200 dark:border-sky-700">
                    <div className="p-4 border-b border-sky-200 dark:border-sky-700 flex justify-between items-center bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded-t-lg">
                        <h3 className="font-semibold flex items-center gap-2">
                            <CustomIcon name="chat" size={24} />
                            Team Chat
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <CustomIcon name="cancel" size={32} className="text-white" />
                        </button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-sky-25 to-blue-25 dark:from-sky-950 dark:to-blue-950">
                        {messages.map(msg => {
                            const user = getUserById(msg.userId);
                            const isCurrentUser = msg.userId === currentUser.uid;
                            const isSystemMessage = msg.userId === 'system';

                            if (isSystemMessage) {
                                return (
                                    <div key={msg.id} className="flex justify-center">
                                        <div className="bg-sky-100 dark:bg-sky-800 text-sky-700 dark:text-sky-300 px-3 py-2 rounded-full text-xs">
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.id} className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : ''}`}>
                                    {!isCurrentUser && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm">
                                            {msg.userName?.charAt(0)}
                                        </div>
                                    )}
                                    <div className={`max-w-[75%] p-3 rounded-lg shadow-sm ${isCurrentUser ?
                                            'bg-gradient-to-br from-sky-500 to-blue-600 text-white' :
                                            'bg-white dark:bg-sky-800 border border-sky-200 dark:border-sky-700'
                                        }`}>
                                        {!isCurrentUser && (
                                            <div className="font-bold text-sm mb-1 text-sky-700 dark:text-sky-300">
                                                {msg.userName}
                                            </div>
                                        )}
                                        <p className="text-sm">{msg.text}</p>
                                        <div className={`text-xs mt-1 opacity-70 ${isCurrentUser ? 'text-sky-100' : 'text-sky-600 dark:text-sky-400'
                                            }`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    {isCurrentUser && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm">
                                            {currentUser.name?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 border-t border-sky-200 dark:border-sky-700 flex gap-2 bg-white dark:bg-sky-900 rounded-b-lg">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg bg-white dark:bg-sky-800 text-gray-900 dark:text-sky-100 placeholder-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        />
                        <button
                            type="submit"
                            className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
                        >
                            <CustomIcon name="send" size={20} />
                        </button>
                    </form>
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105"
                >
                    <CustomIcon name="chat" size={40} />
                </button>
            )}
        </div>
    );
};

export default Chatbox;
