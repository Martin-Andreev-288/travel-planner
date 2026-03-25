import React from "react";
import { motion } from "framer-motion";
import AnimatedGreeting from "./animated-greeting";
import ChatInput from "./chat-input";

interface WelcomeCardProps {
  input: string;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onStartChat?: () => void;
  botActivity: boolean;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({
  input,
  onInputChange,
  onKeyDown,
  onStartChat,
  botActivity,
}) => {
  return (
    <motion.div
      key="initial-wrapper"
      className="grid h-full w-full place-items-center"
    >
      <motion.div
        layoutId="chat-card"
        className="pointer-events-auto w-full max-w-[32rem] rounded-2xl bg-white p-6 text-center shadow-md"
        transition={{ duration: 0.4, type: "tween" }}
      >
        <AnimatedGreeting />
        <ChatInput
          input={input}
          onInputChange={onInputChange}
          onKeyDown={onKeyDown}
          onSubmit={onStartChat}
          botActivity={botActivity}
          placeholder="e.g., I want to do a weekend trip to Paris"
          ariaLabel="Start planning"
        />
      </motion.div>
    </motion.div>
  );
};

export default WelcomeCard;
