// src/components/common/Chatbox.jsx
// Team chat component
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
                <div className="w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col border border-gray-300 dark:border-gray-600">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-semibold">Team Chat</h3>
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <CustomIcon name="cancel" size={24} className="text-gray-500" />
                        </button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map(msg => {
                            const user = getUserById(msg.userId);
                            const isCurrentUser = msg.userId === currentUser.uid;
                            return (
                                <div key={msg.id} className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : ''}`}>
                                    {!isCurrentUser &&
                                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center font-bold text-sm shrink-0">
                                            {msg.userName?.charAt(0)}
                                        </div>
                                    }
                                    <div className={`max-w-[75%] p-3 rounded-lg ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                        {!isCurrentUser && <div className="font-bold text-sm mb-1">{msg.userName}</div>}
                                        <p className="text-sm">{msg.text}</p>
                                        <div className={`text-xs mt-1 opacity-70 ${isCurrentUser ? 'text-blue-200' : ''}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 form-input"
                        />
                        <button type="submit" className="btn-primary !px-3">
                            <CustomIcon name="send" size={20} />
                        </button>
                    </form>
                </div>
            ) : (
                <button onClick={() => setIsOpen(true)} className="bg-blue-600 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700">
                    <CustomIcon name="chat" size={32} />
                </button>
            )}
        </div>
    );
};

export default Chatbox;
