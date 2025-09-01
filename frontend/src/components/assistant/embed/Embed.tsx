'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface EmbedProps {
    assistantId?: string;
}

export const Embed: React.FC<EmbedProps> = ({ assistantId }) => {
    const [activeTab, setActiveTab] = useState<'chatbot' | 'voice'>('chatbot');

    // Sample embed codes
    const embedCodes = {
        chatbot: `<!-- Embed ChatBot via iframe -->
<iframe 
    src="https://acme-chatbot-url.com" 
    width="400" 
    height="600" 
    style="border: none;" 
    allow="microphone;">
</iframe>`,
        voice: `<!-- Embed Voice Assistant via script -->
<script src="https://acme-voice-assistant.com/embed.js" 
    data-assistant-id="${assistantId || 'default'}"
    data-theme="light"
    data-position="bottom-right">
</script>`
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(embedCodes[activeTab])
            .then(() => {
                alert('Embed code copied to clipboard!');
            })
            .catch(err => {
                console.error('Could not copy code: ', err);
            });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 overflow-auto min-h-[42rem]">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
                Embed Code
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
                Copy your chat bot embed from here
            </p>
            
            {/* Tab Selection */}
            <div className="mb-6">
                <nav className="flex space-x-2">
                    <button 
                        onClick={() => setActiveTab('chatbot')}
                        className={`py-2 px-5 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'chatbot'
                                ? 'bg-indigo-500 text-white'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                        }`}
                    >
                        ChatBot
                    </button>
                    <button 
                        onClick={() => setActiveTab('voice')}
                        className={`py-2 px-5 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'voice'
                                ? 'bg-indigo-500 text-white'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                        }`}
                    >
                        Voice Assistant
                    </button>
                </nav>
            </div>
            
            {/* Code Block */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 relative mb-6">
                <div className="absolute right-2 top-2">
                    <button 
                        onClick={copyToClipboard}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        title="Copy to clipboard"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
                <pre className="p-4 text-sm text-gray-800 dark:text-gray-200 whitespace-pre overflow-x-auto">
                    {embedCodes[activeTab]}
                </pre>
            </div>
            
            {/* Done Button */}
            <div className="flex justify-start mt-8">
                <Link href={`/assistant/customize?id=${assistantId}&tab=dashboard`}>
                    <button className="px-5 py-2.5 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800">
                        Apply Settings
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default Embed;
