"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Modal } from "../ui/modal";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { marked } from 'marked';

interface ChatMessage {
  id: number;
  sender: "user" | "bot";
  message: string;
  timestamp: string;
}

interface BuildWithAIPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const BuildWithAIPopup: React.FC<BuildWithAIPopupProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const username = user?.firstName || user?.displayName?.split(" ")[0] || "there";
  const [message, setMessage] = useState("");
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = () => {
    if (message.trim() === "") return;

    // Reset textarea height to default
    const resetTextareaHeight = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.minHeight = '48px';
        textareaRef.current.style.overflowY = 'hidden';
      }
    };

    // If this is the first message, transition to chat mode
    if (!hasStartedChat) {
      setHasStartedChat(true);
      
      // Add user message
      const userMessage: ChatMessage = {
        id: 1,
        sender: "user",
        message: message,
        timestamp: new Date().toISOString(),
      };
      
      setChatMessages([userMessage]);
      setMessage("");
      setIsTyping(true);
      
      // Reset textarea height
      resetTextareaHeight();
      
      // Simulate AI response after a short delay
      setTimeout(() => {
        const botMessage: ChatMessage = {
          id: 2,
          sender: "bot",
          message: getBotResponse(),
          timestamp: new Date().toISOString(),
        };
        
        setChatMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 1500);
    } else {
      // Normal chat flow
      const userMessage: ChatMessage = {
        id: chatMessages.length + 1,
        sender: "user",
        message: message,
        timestamp: new Date().toISOString(),
      };
      
      setChatMessages([...chatMessages, userMessage]);
      setMessage("");
      setIsTyping(true);
      
      // Reset textarea height
      resetTextareaHeight();
      
      setTimeout(() => {
        const botResponse = getBotResponse();
        const botMessage: ChatMessage = {
          id: chatMessages.length + 2,
          sender: "bot",
          message: botResponse,
          timestamp: new Date().toISOString(),
        };
        
        setChatMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 1500);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setHasStartedChat(false);
      setChatMessages([]);
      setMessage("");
      setIsTyping(false);
    }
  }, [isOpen]);

  // Simple function that returns a fixed response regardless of input
  // This is a placeholder - real backend implementation will be added later
  const getBotResponse = (): string => {
    // Create markdown content
    const markdownContent = `
### Great choice, **${username}**!

Let's set it up in **three steps**:

1. **Upload** your FAQs or type them manually  
2. **Choose** the tone (_friendly_, _professional_, _witty_...)  
3. **Select** where it will run (**website**, **WhatsApp**, **app**)  
`;
    
    // Convert markdown to HTML
    return marked.parse(markdownContent) as string;
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-6xl mx-auto p-0 max-h-[100vh] md:max-h-[90vh] overflow-y-auto scrollbar-hide">
      <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-[#F9FAFB]'} rounded-2xl h-[100vh] md:h-[90vh] flex flex-col transition-colors duration-300`}>
        <style jsx global>{`
          .scrollbar-hide {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;  /* Chrome, Safari and Opera */
          }
          
          /* Message content styling */
          .message-content {
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: break-word;
            hyphens: auto;
          }
          .message-content h3 {
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
          }
          .message-content h4 {
            font-size: 1rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
          }
          .message-content p {
            margin-bottom: 0.75rem;
          }
          .message-content ol, .message-content ul {
            padding-left: 1.25rem;
            margin-bottom: 0.75rem;
          }
          .message-content li {
            margin-bottom: 0.4rem;
          }
          .message-content strong {
            font-weight: 700;
          }
          .message-content em {
            font-style: italic;
          }
          .message-content *:last-child {
            margin-bottom: 0;
          }
          @media (max-width: 640px) {
            .message-content h3 {
              font-size: 1rem;
            }
            .message-content h4 {
              font-size: 0.95rem;
            }
            .message-content p, .message-content li {
              font-size: 0.9rem;
            }
          }
        `}</style>
        {!hasStartedChat ? (
          /* Welcome Screen */
          <div className="p-6 sm:p-10 md:p-16 text-center flex-1 flex flex-col justify-center">
            {/* Chat Icon */}
            <div className="flex items-center justify-center">
              <Image 
                src="/images/logo/WhiteMonogram.svg"
                alt="Chat Assistant" 
                width={70} 
                height={70} 
                className="object-contain sm:w-[84px] sm:h-[84px]"
              />
            </div>

            {/* Welcome Text */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium bg-gradient-to-b from-purple-600 to-indigo-400 bg-clip-text text-transparent">
              Welcome {username}!
            </h1>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-400'} text-xm font-medium mb-3`}>
              What do you want to create today?
            </p>

            {/* Input Field */}
            <div className={`flex items-center ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-4xl p-3 w-full max-w-3xl mx-auto shadow-sm border transition-colors duration-300`}>
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    // Auto-resize logic
                    e.target.style.height = "auto";
                    const newHeight = Math.min(e.target.scrollHeight, 128); // Max 4 lines (32px per line)
                    e.target.style.height = `${newHeight}px`;
                    // Enable scrolling when content exceeds max height but hide scrollbar
                    e.target.style.overflowY = e.target.scrollHeight > 128 ? "auto" : "hidden";
                    e.target.className = e.target.scrollHeight > 128 ? e.target.className + " scrollbar-hide" : e.target.className;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything"
                  rows={1}
                  style={{ resize: "none", overflow: "hidden", height: "auto", minHeight: "48px" }}
                  className={`w-full bg-transparent px-6 py-4 ${theme === 'dark' ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'} focus:outline-none text-base`}
                />
              </div>
              <button
                onClick={handleSendMessage}
                className="w-10 h-10 bg-indigo-400 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-lg"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* Chat Interface */
          <div className="flex flex-col h-full">
            {/* Chat Messages with scrollable area including welcome part */}
            <div className="flex-1 overflow-auto scrollbar-hide px-3 sm:px-6 md:px-12 py-4 sm:py-6 mt-3 sm:mt-6 space-y-4 sm:space-y-6">
              {/* Welcome part - now part of scrollable content */}
              <div className="text-center mb-4 sm:mb-6 px-2">
                <div className="flex items-center justify-center mx-auto mb-3 sm:mb-4 overflow-hidden">
                  <Image 
                    src="/images/logo/WhiteMonogram.svg"
                    alt="Chat Assistant" 
                    width={70} 
                    height={70} 
                    className="object-contain sm:w-[84px] sm:h-[84px]"
                  />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-purple-600 to-indigo-400 bg-clip-text text-transparent">
                  Hey {username}!
                </h1>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} text-sm sm:text-base`}>
                  explain about what do you want to create today?
                </p>
              </div>
              
              {/* Chat messages */}
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mx-2 sm:mx-6`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-2xl px-3 sm:px-5 py-3 sm:py-4 break-words transition-colors duration-300 ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-[#C8CEFF] to-[#E9EAFA] text-black rounded-br-md"
                        : "bg-gradient-to-r from-[#7774FB] to-[#5E73FD] text-white rounded-bl-md shadow-lg"
                    }`}
                  >
                    <div 
                      className={`text-sm leading-relaxed message-content ${msg.sender === "bot" ? "font-medium" : ""}`}
                      dangerouslySetInnerHTML={{ __html: msg.message }}
                    ></div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start mx-2 sm:mx-6">
                  <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-2xl rounded-bl-md px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-[#7774FB] to-[#5E73FD] text-white shadow-lg transition-shadow duration-300">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
            
            {/* Input Area */}
            <div className={`p-3 sm:p-4 md:p-6 transition-colors duration-300`}>
              <div className={`flex items-center ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'} rounded-3xl sm:rounded-4xl p-2 sm:p-3 shadow-sm border transition-colors duration-300 max-w-3xl mx-auto`}>
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      // Auto-resize logic
                      e.target.style.height = "auto";
                      const newHeight = Math.min(e.target.scrollHeight, 128); // Max 4 lines (32px per line)
                      e.target.style.height = `${newHeight}px`;
                      // Enable scrolling when content exceeds max height but hide scrollbar
                      e.target.style.overflowY = e.target.scrollHeight > 128 ? "auto" : "hidden";
                      e.target.className = e.target.scrollHeight > 128 ? e.target.className + " scrollbar-hide" : e.target.className;
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Choose an idea, upload a file, or ask your assistant anything."
                    rows={1}
                    style={{ resize: "none", overflow: "hidden", height: "auto", minHeight: "48px" }}
                    className={`w-full bg-transparent px-6 py-3 ${theme === 'dark' ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'} focus:outline-none text-sm`}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  className="w-10 h-10 bg-indigo-400 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BuildWithAIPopup;