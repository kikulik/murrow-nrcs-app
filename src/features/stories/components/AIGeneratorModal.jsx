// src/features/stories/components/AIGeneratorModal.jsx
import React, { useState } from 'react';
import ModalBase from '../../../components/common/ModalBase';
import InputField from '../../../components/ui/InputField';
import CustomIcon from '../../../components/ui/CustomIcon';
import { generateStory } from '../../../services/AIService';

const AIGeneratorModal = ({ onCancel, onGenerate }) => {
    const [prompt, setPrompt] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a topic to generate a story.');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedContent('');

        try {
            const content = await generateStory(prompt);
            setGeneratedContent(content);
        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInsert = () => {
        if (generatedContent) {
            onGenerate(generatedContent);
            onCancel();
        }
    };

    return (
        <ModalBase onCancel={onCancel} title="Generate Story with AI" maxWidth="max-w-3xl">
            <div className="p-6 space-y-4">
                <InputField
                    label="Story Topic"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., local election results for today"
                />
                
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="btn-primary w-full"
                >
                    <CustomIcon name="stories" size={20} />
                    <span>{isLoading ? 'Generating...' : 'Generate Story'}</span>
                </button>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Generated Content
                    </label>
                    <div className="w-full h-64 p-2 border rounded-md bg-gray-50 dark:bg-gray-800 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <p className="text-sm whitespace-pre-wrap">{generatedContent}</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button
                    onClick={handleInsert}
                    className="btn-primary"
                    disabled={!generatedContent || isLoading}
                >
                    <CustomIcon name="add story" size={20} />
                    <span>Insert into Editor</span>
                </button>
            </div>
        </ModalBase>
    );
};

export default AIGeneratorModal;
