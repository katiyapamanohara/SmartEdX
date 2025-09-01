import React from 'react';

interface PromptsTabProps {
  prompts: {
    systemPrompt: string;
    userPrompt: string;
    greetingMessage: string;  // Added greeting message
    errorMessage: string;     // Added error message
  };
  handlePromptChange: (field: string, value: string) => void;
}

const PromptsTab: React.FC<PromptsTabProps> = ({
  prompts,
  handlePromptChange
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">Agent Prompts</h3>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
          <div>
            <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              System Prompt
            </label>
            <textarea
              id="systemPrompt"
              value={prompts.systemPrompt}
              onChange={(e) => handlePromptChange('systemPrompt', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
              placeholder="Provide instructions for the AI's behavior..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This prompt defines the behavior and capabilities of the AI assistant. It&apos;s sent at the beginning of each conversation.
            </p>
          </div>

          <div>
            <label htmlFor="userPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default User Prompt
            </label>
            <textarea
              id="userPrompt"
              value={prompts.userPrompt}
              onChange={(e) => handlePromptChange('userPrompt', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
              placeholder="Enter a default question or statement from the user..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This is the initial prompt sent to the AI when a user starts a new conversation.
            </p>
          </div>

          <div>
            <label htmlFor="greetingMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Greeting Message
            </label>
            <textarea
              id="greetingMessage"
              value={prompts.greetingMessage}
              onChange={(e) => handlePromptChange('greetingMessage', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
              placeholder="Enter a greeting message for new conversations..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This message will be displayed when a user starts a new conversation with the agent.
            </p>
          </div>

          <div>
            <label htmlFor="errorMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Error Message
            </label>
            <textarea
              id="errorMessage"
              value={prompts.errorMessage}
              onChange={(e) => handlePromptChange('errorMessage', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
              placeholder="Enter a message to display when an error occurs..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This message will be shown to users when the agent encounters an error or cannot respond.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PromptsTab;