import React, { FormEventHandler, useLayoutEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  input: string;
  onInputChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit?: () => void;
  botActivity: boolean;
  placeholder: string;
  ariaLabel: string;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  isDisabled?: boolean;
  // How many lines the box grows to before it scrolls instead
  maxRows?: number;
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
  maxRows = 4,
}) => {
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? ownRef;
  const isInputDisabled = isDisabled ?? botActivity;
  const isButtonDisabled = isInputDisabled || !input.trim();

  // Grow (or shrink back, e.g. after sending) to fit the text. Resetting the
  // height first lets scrollHeight report the height the text needs; the CSS
  // max-height then caps it and the box scrolls beyond that.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    // scrollHeight leaves out the border, but the height includes it
    // (box-sizing: border-box), so it's added back. Without it the box is 2px
    // too short for its text and scrolls, even with a single line.
    const border = textarea.offsetHeight - textarea.clientHeight;
    textarea.style.height = `${textarea.scrollHeight + border}px`;
  }, [input, textareaRef]);

  const handleSubmit = () => {
    if (!isButtonDisabled) {
      onSubmit?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
    // Enter sends, Shift+Enter adds a line. While composing text with an
    // input method (e.g. Japanese), Enter confirms the characters instead.
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      !onKeyDown
    ) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <form onSubmit={handleFormSubmit} className="relative">
      {/* One line looks like the previous single-line pill (50px high,
          24px radius); longer text grows the box downwards. Past maxRows it
          scrolls (mouse wheel, touchpad, keyboard) with the scrollbar hidden,
          which would otherwise clash with the rounded corner and the button. */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={onInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        // maxRows lines of 1.5rem, plus the 0.75rem padding above and below
        // and the 1px border above and below (border-box includes it)
        style={{ maxHeight: `calc(${maxRows} * 1.5rem + 1.5rem + 2px)` }}
        className="block w-full resize-none overflow-y-auto rounded-3xl border border-gray-300 bg-white px-4 py-3 pr-14 text-left leading-6 [scrollbar-width:none] focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none [&::-webkit-scrollbar]:hidden"
        disabled={isInputDisabled}
      />
      {/* Stays in the bottom-right corner as the box grows */}
      <button
        type="submit"
        disabled={isButtonDisabled}
        className={`absolute right-2 bottom-[6px] rounded-full p-2.5 text-white transition-colors focus:outline-none ${
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
