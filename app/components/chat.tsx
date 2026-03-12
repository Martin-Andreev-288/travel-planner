import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Message } from "@ai-sdk/react";
import ChatInput from "./chat-input";
import TypingIndicator from "../api/chat/typing-indicator"; // Adjust path
import { twMerge } from "tailwind-merge";

interface ChatProps {
  className: string;
  messages: Message[];
  botActivity: boolean;
  input: string;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

const Chat: React.FC<ChatProps> = ({
  className,
  messages,
  botActivity,
  input,
  onInputChange,
  onKeyDown,
  onSubmit,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to the most recent message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Refocus input when bot finishes responding
  useEffect(() => {
    if (!botActivity) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [botActivity, inputRef]);

  return (
    <motion.div
      layoutId="chat-card"
      className={twMerge(
        `pointer-events-auto col-span-1 flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white/60 shadow-md backdrop-blur-md`,
        className,
      )}
      transition={{ duration: 0.4, type: "tween" }}
    >
      <div className="scrollbar scrollbar-track-transparent scrollbar-thumb-gray-400/50 scrollbar-thumb-rounded-full scrollbar-w-1.5 flex-grow space-y-5 overflow-y-auto p-6">
        {messages
          .filter((message) => message.content.trim())
          .map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`prose max-w-[85%] ${
                  message.role === "user"
                    ? "rounded-2xl rounded-tr-none bg-slate-700 px-4 py-3 text-white shadow-sm"
                    : ""
                }`}
              >
                {message.role === "assistant" ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
        {botActivity && <TypingIndicator />}
        <div ref={messagesEndRef} /> {/* For auto-scrolling */}
      </div>
      {/* Input area */}
      <div className="p-4">
        <ChatInput
          inputRef={inputRef}
          input={input}
          onInputChange={onInputChange}
          onKeyDown={onKeyDown}
          onSubmit={onSubmit}
          botActivity={botActivity}
          placeholder="Type your message..."
          ariaLabel="Send message"
        />
      </div>
    </motion.div>
  );
};

export default Chat;
