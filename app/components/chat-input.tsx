import React, { FormEventHandler } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  input: string;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit?: () => void;
  botActivity: boolean;
  placeholder: string;
  ariaLabel: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  isDisabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  onInputChange,
  onKeyDown,
  onSubmit,
  botActivity,
  placeholder,
  ariaLabel,
  inputRef,
  isDisabled,
}) => {
  const isInputDisabled = isDisabled ?? botActivity;
  const isButtonDisabled = isInputDisabled || !input.trim();

  const handleSubmit = () => {
    if (!isButtonDisabled) {
      onSubmit?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
    if (e.key === "Enter" && !e.shiftKey && !isButtonDisabled && !onKeyDown) {
      e.preventDefault();
      handleSubmit?.();
    }
  };

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <form onSubmit={handleFormSubmit} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={onInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-full border border-gray-300 bg-white px-4 py-3 pr-14 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
        disabled={isInputDisabled}
      />
      <button
        type="submit"
        disabled={isButtonDisabled}
        className={`absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2.5 text-white transition-colors focus:outline-none ${
          isButtonDisabled
            ? "cursor-not-allowed bg-slate-400"
            : "bg-slate-600 hover:bg-slate-700"
        }`}
        aria-label={ariaLabel}
      >
        {botActivity ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <ArrowUp size={18} strokeWidth={3} />
        )}
      </button>
    </form>
  );
};

export default ChatInput;
