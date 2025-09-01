'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface IntegrationTabProps {
  settings?: {
    name?: string;
    primaryColor?: string;
    avatarUrl?: string;
    webWidgetFontSize?: string | null;
    webWidgetBotMessageColor?: string | null;
    webWidgetUserMessageColor?: string | null;
    webWidgetDisplayName?: string;
    webWidgetThemeColor?: string;
    webWidgetDisplayIconURL?: string;
    [key: string]: string | boolean | number | File | null | undefined;
  };
  onChange?: (name: string, value: string | number) => void;
  onImageChange?: (file: File | null) => void;
}

export const IntegrationTab: React.FC<IntegrationTabProps> = ({
  settings = {},
  onChange,
  onImageChange
}) => {
  // Initialize state with only values from settings, no defaults
  const [botName, setBotName] = useState(settings.webWidgetDisplayName || settings.name || '');
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof themeBgColors>(() => {
    // Detect theme from color if provided
    if (!settings.primaryColor) return 'custom'; // Don't default to 'blue', let the backend data control this

    if (settings.primaryColor.toLowerCase() === '#f97316') return 'orange';
    if (settings.primaryColor.toLowerCase() === '#60a5fa') return 'blue';
    if (settings.primaryColor.toLowerCase() === '#e879f9') return 'purple';
    if (settings.primaryColor.toLowerCase() === '#facc15') return 'yellow';
    if (settings.primaryColor.toLowerCase() === '#34d399') return 'green';
    if (settings.primaryColor.toLowerCase() === '#22d3ee') return 'teal';
    if (settings.primaryColor.toLowerCase() === '#f87171') return 'red';
    return 'custom';
  });
  const [fontSize, setFontSize] = useState(settings.webWidgetFontSize || '');
  const [customColor, setCustomColor] = useState(settings.primaryColor || '');
  const [customGradientColor, setCustomGradientColor] = useState(''); // Remove default
  const [botBubbleColor, setBotBubbleColor] = useState(settings.webWidgetBotMessageColor || '');
  const [userBubbleColor, setUserBubbleColor] = useState(settings.webWidgetUserMessageColor || '');
  const [customIconUrl, setCustomIconUrl] = useState(settings.webWidgetDisplayIconURL || '');
  const fileInputRef = useRef<HTMLInputElement>(null);  // Update local state when props change

  useEffect(() => {
    // Only update if we have actual settings from the backend
    if (Object.keys(settings).length > 0) {
      // Check and update each field if we have values      
      const displayName = settings.webWidgetDisplayName || settings.name;
      if (displayName) {
        setBotName(displayName);
      }

      // First check webWidgetThemeColor (API field), then fallback to primaryColor (UI field)
      const themeColor = settings.webWidgetThemeColor || settings.primaryColor;
      if (themeColor) {
        setCustomColor(themeColor);

        // Also update the theme selection based on color
        const themeFromColor =
          themeColor.toLowerCase() === '#f97316' ? 'orange' :
            themeColor.toLowerCase() === '#60a5fa' ? 'blue' :
              themeColor.toLowerCase() === '#e879f9' ? 'purple' :
                themeColor.toLowerCase() === '#facc15' ? 'yellow' :
                  themeColor.toLowerCase() === '#34d399' ? 'green' :
                    themeColor.toLowerCase() === '#22d3ee' ? 'teal' :
                      themeColor.toLowerCase() === '#f87171' ? 'red' :
                        'custom';

        setSelectedTheme(themeFromColor as keyof typeof themeBgColors);
      }

      // Check for font size
      if (settings.webWidgetFontSize) {
        setFontSize(settings.webWidgetFontSize);
      }

      // Check for bot bubble color
      if (settings.webWidgetBotMessageColor) {
        setBotBubbleColor(settings.webWidgetBotMessageColor);
      }

      // Check for user bubble color
      if (settings.webWidgetUserMessageColor) {
        setUserBubbleColor(settings.webWidgetUserMessageColor);
      }
      setCustomIconUrl(settings.webWidgetDisplayIconURL || '');
    }
  }, [settings]);

  // Theme background colors for the chat window
  const themeBgColors = {
    orange: 'bg-gradient-to-r from-orange-500 to-red-500',
    blue: 'bg-gradient-to-r from-blue-400 to-blue-600',
    purple: 'bg-gradient-to-r from-pink-400 to-purple-600',
    yellow: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
    green: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    teal: 'bg-gradient-to-r from-cyan-400 to-blue-500',
    red: 'bg-gradient-to-r from-red-400 to-rose-600',
    custom: ''
  };

  // Update parent component's settings when values change
  useEffect(() => {
    // Skip onChange calls during the initial render or if onChange is not provided
    if (!onChange) return;

    // Create a batch of all changes to make at once
    const updates: Record<string, string | number> = {
      'name': botName,
      'fontSize': fontSize,
      'botBubbleColor': botBubbleColor,
      'userBubbleColor': userBubbleColor
    };

    if (selectedTheme === 'custom') {
      updates['primaryColor'] = customColor;
      updates['secondaryColor'] = customGradientColor;
      updates['theme'] = 'custom';
    } else {
      // Extract the primary color from the theme
      const primaryColors = {
        orange: '#F97316',
        blue: '#60A5FA',
        purple: '#E879F9',
        yellow: '#FACC15',
        green: '#34D399',
        teal: '#22D3EE',
        red: '#F87171'
      };

      const secondaryColors = {
        orange: '#EF4444',
        blue: '#3B82F6',
        purple: '#A855F7',
        yellow: '#EAB308',
        green: '#14B8A6',
        teal: '#0EA5E9',
        red: '#E11D48'
      };

      updates['primaryColor'] = primaryColors[selectedTheme as keyof typeof primaryColors] || '#6366F1';
      updates['secondaryColor'] = secondaryColors[selectedTheme as keyof typeof secondaryColors] || '#8B5CF6';
      updates['theme'] = selectedTheme;
    }

  }, [
    botName,
    selectedTheme,
    customColor,
    customGradientColor,
    fontSize,
    botBubbleColor,
    userBubbleColor,
    onChange
  ]);

  // Handle file upload for custom icon
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setCustomIconUrl(objectUrl);

      if (onImageChange) {
        onImageChange(file);
      }
    }
  };

  // Open file dialog when upload button is clicked
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Remove custom icon
  const handleRemoveIcon = () => {
    setCustomIconUrl('');
    if (onImageChange) {
      onImageChange(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update bot name
  const handleBotNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setBotName(newValue);

    // Explicitly notify parent of change
    if (onChange) {
      onChange('name', newValue);
    }
  };

  // Update font size
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setFontSize(newValue);

    // Explicitly notify parent of change
    if (onChange) {
      onChange('fontSize', newValue);
    }
  };

  // Update custom colors
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomColor(newValue);

    // Explicitly notify parent of change
    if (onChange && selectedTheme === 'custom') {
      onChange('primaryColor', newValue);
    }
  };

  const handleCustomGradientColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomGradientColor(newValue);

    // Explicitly notify parent of change
    if (onChange && selectedTheme === 'custom') {
      onChange('secondaryColor', newValue);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Column - Settings */}
      <div className="space-y-6">
        {/* Chatbot Theme */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Chatbot Theme</h3>
          <div className="flex flex-wrap gap-3">
            <button
              className={`w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center border-2 ${selectedTheme === 'orange' ? 'border-gray-700' : 'border-transparent'} hover:border-gray-300`}
              onClick={() => {
                setSelectedTheme('orange');
                if (onChange) {
                  onChange('primaryColor', '#F97316');
                  onChange('theme', 'orange');
                }
              }}
            ></button>
            <button
              className={`w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center border-2 ${selectedTheme === 'blue' ? 'border-gray-700' : 'border-transparent'} hover:border-gray-300`}
              onClick={() => {
                setSelectedTheme('blue');
                if (onChange) {
                  onChange('primaryColor', '#60A5FA');
                  onChange('theme', 'blue');
                }
              }}
            ></button>
            <button
              className={`w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-purple-600 flex items-center justify-center border-2 ${selectedTheme === 'purple' ? 'border-gray-700' : 'border-transparent'} hover:border-gray-300`}
              onClick={() => {
                setSelectedTheme('purple');
                if (onChange) {
                  onChange('primaryColor', '#E879F9');
                  onChange('theme', 'purple');
                }
              }}
            ></button>
            <button
              className={`w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center border-2 ${selectedTheme === 'yellow' ? 'border-gray-700' : 'border-transparent'} hover:border-gray-300`}
              onClick={() => {
                setSelectedTheme('yellow');
                if (onChange) {
                  onChange('primaryColor', '#FACC15');
                  onChange('theme', 'yellow');
                }
              }}
            ></button>
            <button
              className={`w-12 h-12 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center justify-center border-2 ${selectedTheme === 'green' ? 'border-gray-700' : 'border-transparent'} hover:border-gray-300`}
              onClick={() => {
                setSelectedTheme('green');
                if (onChange) {
                  onChange('primaryColor', '#34D399');
                  onChange('theme', 'green');
                }
              }}
            ></button>
            <button
              className={`w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center border-2 ${selectedTheme === 'teal' ? 'border-gray-700' : 'border-transparent'} hover:border-gray-300`}
              onClick={() => {
                setSelectedTheme('teal');
                if (onChange) {
                  onChange('primaryColor', '#22D3EE');
                  onChange('theme', 'teal');
                }
              }}
            ></button>
            <button
              className={`w-12 h-12 rounded-full bg-gradient-to-r from-red-400 to-rose-600 flex items-center justify-center border-2 ${selectedTheme === 'red' ? 'border-gray-700' : 'border-transparent'} hover:border-gray-300`}
              onClick={() => {
                setSelectedTheme('red');
                if (onChange) {
                  onChange('primaryColor', '#F87171');
                  onChange('theme', 'red');
                }
              }}
            ></button>
            <button
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${selectedTheme === 'custom' ? 'border-gray-700' : 'border-transparent'} hover:border-gray-300`}
              onClick={() => {
                setSelectedTheme('custom');
                if (onChange) {
                  onChange('primaryColor', customColor || '#6366F1');
                  onChange('theme', 'custom');
                }
              }}
              style={{
                backgroundImage: `linear-gradient(to right, ${customColor || '#6366F1'}, ${customGradientColor || '#8B5CF6'})`
              }}
            >
              {selectedTheme !== 'custom' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
            </button>
          </div>

          {/* Custom color picker */}
          {selectedTheme === 'custom' && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center">
                <div className="w-20">
                  <span className="text-sm font-medium text-gray-700">Primary</span>
                </div>
                <input
                  type="color"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  className="w-10 h-10 rounded-md border border-gray-300 p-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  className="ml-3 px-3 py-2 border border-gray-200 rounded-md text-sm w-28"
                  placeholder="#FFFFFF"
                />
              </div>
              <div className="flex items-center">
                <div className="w-20">
                  <span className="text-sm font-medium text-gray-700">Secondary</span>
                </div>
                <input
                  type="color"
                  value={customGradientColor}
                  onChange={handleCustomGradientColorChange}
                  className="w-10 h-10 rounded-md border border-gray-300 p-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={customGradientColor}
                  onChange={handleCustomGradientColorChange}
                  className="ml-3 px-3 py-2 border border-gray-200 rounded-md text-sm w-28"
                  placeholder="#FFFFFF"
                />
              </div>
              <div className="h-8 w-full rounded-md mt-2" style={{
                backgroundImage: `linear-gradient(to right, ${customColor || '#6366F1'}, ${customGradientColor || '#8B5CF6'})`
              }}></div>
            </div>
          )}
        </div>

        {/* Display Name */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Display Name</h3>          <input
            type="text"
            placeholder="Enter bot name"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={botName}
            onChange={handleBotNameChange}
          />
        </div>

        {/* Display Icon */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Display Icon</h3>
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${!customIconUrl ? (selectedTheme === 'custom' ? '' : themeBgColors[selectedTheme as keyof typeof themeBgColors]) : ''}`}
              style={!customIconUrl && selectedTheme === 'custom' ? {
                backgroundImage: `linear-gradient(to right, ${customColor || '#6366F1'}, ${customGradientColor || '#8B5CF6'})`
              } : {}}
            >              {customIconUrl ? (
              <Image
                src={customIconUrl}
                alt="Bot Icon"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </>
            )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Recommended size: 250x250px</p>
              <div className="flex mt-2 space-x-2">
                <button
                  className="p-2 border border-gray-200 rounded hover:bg-gray-100"
                  onClick={handleRemoveIcon}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  className="p-2 border border-gray-200 rounded hover:bg-gray-100"
                  onClick={handleUploadClick}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="sr-only">Change Image</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Font Size */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Font Size</h3>
          <div className="relative">
            <select
              className="block appearance-none w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:border-blue-500"
              value={fontSize}
              onChange={handleFontSizeChange}
            >
              <option value="12px">12px</option>
              <option value="14px">14px</option>
              <option value="16px">16px</option>
              <option value="18px">18px</option>
              <option value="20px">20px</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
          </div>
        </div>

        {/* Chat Bubble Colors */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Chat Bubble Colors</h3>

          {/* Bot Bubble Color */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bot Messages</label>
            <div className="flex items-center">
              <input
                type="color"
                value={botBubbleColor || '#F0F0F0'}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setBotBubbleColor(newValue);
                  if (onChange) {
                    onChange('botBubbleColor', newValue);
                  }
                }}
                className="w-10 h-10 rounded-full border border-gray-300 p-0 cursor-pointer"
              />
              <input
                type="text"
                value={botBubbleColor || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setBotBubbleColor(newValue);
                  if (onChange) {
                    onChange('botBubbleColor', newValue);
                  }
                }}
                className="ml-3 px-3 py-2 border border-gray-200 rounded-md text-sm"
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          {/* User Bubble Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Messages</label>            <div className="flex items-center">              <input
              type="color"
              value={userBubbleColor || '#E0E0FF'}
              onChange={(e) => {
                const newValue = e.target.value;
                setUserBubbleColor(newValue);
                if (onChange) {
                  onChange('userBubbleColor', newValue);
                }
              }}
              className="w-10 h-10 rounded-full border border-gray-300 p-0 cursor-pointer"
            />
              <input
                type="text"
                value={userBubbleColor || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setUserBubbleColor(newValue);
                  if (onChange) {
                    onChange('userBubbleColor', newValue);
                  }
                }}
                className="ml-3 px-3 py-2 border border-gray-200 rounded-md text-sm"
                placeholder="#F3F4F6"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Chat Preview */}
      <div className="border rounded-xl shadow-sm overflow-hidden h-[600px] bg-white flex flex-col">
        {/* Preview Header */}
        <div className="text-center p-4 text-sm text-gray-500 border-b">
          Live Preview - Web Integration
        </div>

        {/* Chat UI Preview */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
          <div className="flex flex-col space-y-4 h-full">
            {/* Website Frame */}
            <div className="bg-white border rounded-lg shadow-sm p-4 flex flex-col h-full">
              {/* Chat Container */}
              <div className="border rounded-md overflow-hidden flex flex-col h-full">                {/* Chat Header */}                <div
                className={`p-3 flex items-center ${selectedTheme === 'custom' ? '' : themeBgColors[selectedTheme as keyof typeof themeBgColors]}`}
                style={selectedTheme === 'custom' ? {
                  backgroundImage: `linear-gradient(to right, ${customColor || '#6366F1'}, ${customGradientColor || '#8B5CF6'})`
                } : {}}
              >
                <div className="bg-white bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center mr-3 overflow-hidden">
                  {customIconUrl ? (
                    <Image
                      src={customIconUrl}
                      alt="Bot Icon"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  )}
                </div>
                <div className="text-white font-medium">{botName || 'Chat Assistant'}</div>
              </div>
                {/* Chat Messages */}
                <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
                  <div className="flex flex-col space-y-3">
                    {/* Bot Message */}
                    <div className="flex items-start">
                      <div className="p-3 rounded-lg shadow-sm max-w-[70%]" style={{
                        fontSize: fontSize || undefined,
                        backgroundColor: botBubbleColor || undefined
                      }}>
                        <p>Hi there! How can I help you today?</p>
                      </div>
                    </div>

                    {/* User Message */}
                    <div className="flex items-start justify-end">
                      <div className="p-3 rounded-lg shadow-sm max-w-[70%]" style={{
                        fontSize: fontSize || undefined,
                        backgroundColor: userBubbleColor || undefined
                      }}>
                        <p>I have a question about your services.</p>
                      </div>
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Bot Message */}
                    <div className="flex items-start">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 overflow-hidden ${!customIconUrl ? (selectedTheme === 'custom' ? '' : themeBgColors[selectedTheme]) : ''}`}
                        style={!customIconUrl && selectedTheme === 'custom' ? {
                          backgroundImage: `linear-gradient(to right, ${customColor || '#6366F1'}, ${customGradientColor || '#8B5CF6'})`
                        } : {}}
                      >
                        {customIconUrl ? (
                          <Image
                            src={customIconUrl}
                            alt="Bot Icon"
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        )}
                      </div>
                      <div className="p-3 rounded-lg shadow-sm max-w-[70%]" style={{
                        fontSize: fontSize || undefined,
                        backgroundColor: botBubbleColor || undefined
                      }}>
                        <p>Of course! I&apos;d be happy to help. What specific service are you interested in?</p>
                      </div>
                    </div>

                    {/* User Typing Message */}
                    <div className="flex items-start justify-end">
                      <div className="p-3 rounded-lg shadow-sm max-w-[70%]" style={{
                        fontSize: fontSize || undefined,
                        backgroundColor: userBubbleColor || undefined
                      }}>
                        <p>I&apos;m interested in your AI solutions...</p>
                      </div>
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="p-3 bg-white border-t">
                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      className={`ml-2 p-2 rounded-full text-white ${selectedTheme === 'custom' ? '' : themeBgColors[selectedTheme]}`}
                      style={selectedTheme === 'custom' ? {
                        backgroundImage: `linear-gradient(to right, ${customColor || '#6366F1'}, ${customGradientColor || '#8B5CF6'})`
                      } : {}}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationTab;