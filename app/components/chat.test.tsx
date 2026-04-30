import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Message } from "@ai-sdk/react";
import Chat from "./chat";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      layoutId: _layoutId,
      transition: _transition,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & {
      layoutId?: string;
      transition?: unknown;
    }) => (
      <div className={className} {...rest}>
        {children}
      </div>
    ),
  },
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <span data-testid="markdown">{children}</span>
  ),
}));

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

const userMessage: Message = { id: "1", role: "user", content: "Hello there" };
const assistantMessage: Message = {
  id: "2",
  role: "assistant",
  content: "Hi! How can I help?",
};

function renderChat(
  overrides: Partial<React.ComponentProps<typeof Chat>> = {},
) {
  const props = {
    className: "",
    messages: [] as Message[],
    botActivity: false,
    input: "",
    onSubmit: vi.fn(),
    ...overrides,
  };
  return { ...render(<Chat {...props} />), ...props };
}

describe("Chat", () => {
  it("renders a user message", () => {
    renderChat({ messages: [userMessage] });
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("renders an assistant message", () => {
    renderChat({ messages: [assistantMessage] });
    expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
  });

  it("does not render messages with blank content", () => {
    const blank: Message = { id: "3", role: "user", content: "   " };
    renderChat({ messages: [blank] });
    expect(screen.queryByText("   ")).not.toBeInTheDocument();
  });

  it("renders multiple messages", () => {
    renderChat({ messages: [userMessage, assistantMessage] });
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
  });

  it("right-aligns user messages", () => {
    renderChat({ messages: [userMessage] });
    const wrapper = screen.getByText("Hello there").closest(".flex");
    expect(wrapper).toHaveClass("justify-end");
  });

  it("left-aligns assistant messages", () => {
    renderChat({ messages: [assistantMessage] });
    const wrapper = screen.getByText("Hi! How can I help?").closest(".flex");
    expect(wrapper).toHaveClass("justify-start");
  });

  it("renders assistant messages through ReactMarkdown", () => {
    renderChat({ messages: [assistantMessage] });
    expect(screen.getByTestId("markdown")).toBeInTheDocument();
  });

  it("does not use ReactMarkdown for user messages", () => {
    renderChat({ messages: [userMessage] });
    expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
  });

  it("shows the TypingIndicator when botActivity is true", () => {
    renderChat({ botActivity: true });
    const dots = document.querySelectorAll(".animate-bounce");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("hides the TypingIndicator when botActivity is false", () => {
    renderChat({ botActivity: false });
    const dots = document.querySelectorAll(".animate-bounce");
    expect(dots).toHaveLength(0);
  });

  it("calls onSubmit when the send button is clicked", async () => {
    const onSubmit = vi.fn();
    renderChat({ input: "hello", onSubmit });
    await userEvent.click(screen.getByRole("button"));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("calls onInputChange when the user types", async () => {
    const onInputChange = vi.fn();
    renderChat({ onInputChange });
    await userEvent.type(screen.getByRole("textbox"), "a");
    expect(onInputChange).toHaveBeenCalled();
  });

  it("calls onKeyDown when a key is pressed in the input", async () => {
    const onKeyDown = vi.fn();
    renderChat({ onKeyDown });
    await userEvent.type(screen.getByRole("textbox"), "{enter}");
    expect(onKeyDown).toHaveBeenCalled();
  });

  it("scrolls to the bottom when messages change", () => {
    const { rerender } = renderChat({ messages: [userMessage] });
    rerender(
      <Chat
        className=""
        messages={[userMessage, assistantMessage]}
        botActivity={false}
        input=""
        onSubmit={vi.fn()}
      />,
    );
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("refocuses the input when botActivity transitions to false", async () => {
    vi.useFakeTimers();
    const { rerender } = renderChat({ botActivity: true });
    rerender(
      <Chat
        className=""
        messages={[]}
        botActivity={false}
        input=""
        onSubmit={vi.fn()}
      />,
    );
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
    vi.useRealTimers();
  });
});
