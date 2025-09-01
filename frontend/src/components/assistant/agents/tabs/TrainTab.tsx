import React, { useState, KeyboardEvent } from 'react';

interface TrainTabProps {
  initialPrompt: string;
  instructions: string[];
  handleTrainingChange: (field: string, value: string) => void;
  addInstruction: (instruction: string) => void;
  removeInstruction: (index: number) => void;
}

const TrainTab: React.FC<TrainTabProps> = ({
  initialPrompt,
  instructions,
  handleTrainingChange,
  addInstruction,
  removeInstruction
}) => {
  const [newInstruction, setNewInstruction] = useState('');

  const handleAddInstruction = () => {
    if (newInstruction.trim()) {
      addInstruction(newInstruction);
      setNewInstruction('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newInstruction.trim()) {
      e.preventDefault();
      handleAddInstruction();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">Agent Training</h3>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
          <div>
            <label htmlFor="initialPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Initial Prompt
            </label>
            <textarea
              id="initialPrompt"
              value={initialPrompt}
              onChange={(e) => handleTrainingChange('initialPrompt', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
              placeholder="Provide a starting prompt to define the agent's capabilities..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Define the capabilities and knowledge areas of this agent.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">Training Instructions</h3>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
          <div>
            <label htmlFor="instructionInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Instructions (press Enter to add)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="instructionInput"
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                placeholder="Type instruction and press Enter..."
              />
              <button
                onClick={handleAddInstruction}
                disabled={!newInstruction.trim()}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-indigo-800"
              >
                Add
              </button>
            </div>
          </div>

          {/* List of current instructions */}
          <div className="mt-4">
            {instructions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No instructions added yet</p>
            ) : (
              <ul className="space-y-2">
                {instructions.map((instruction, index) => (
                  <li key={index} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-800 dark:text-gray-200">{instruction}</span>
                    <button
                      onClick={() => removeInstruction(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainTab;