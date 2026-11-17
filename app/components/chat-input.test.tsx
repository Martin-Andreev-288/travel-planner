import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatInput from "./chat-input";

function renderInput(
  overrides: Partial<React.ComponentProps<typeof ChatInput>> = {},
) {
  const props = {
    input: "",
    onInputChange: vi.fn(),
    onSubmit: vi.fn(),
    botActivity: false,
    placeholder: "Type your message...",
    ariaLabel: "Send message",
    ...overrides,
  };
  const utils = render(<ChatInput {...props} />);
  return { ...utils, props, box: screen.getByRole("textbox") };
}

describe("ChatInput — typing and sending", () => {
  it("is a multi-line text box", () => {
    const { box } = renderInput();
    expect(box.tagName).toBe("TEXTAREA");
  });

  it("sends with Enter", async () => {
    const { box, props } = renderInput({ input: "Weekend in Berlin" });
    box.focus();
    await userEvent.keyboard("{Enter}");
    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it("doesn't send with Shift+Enter, which adds a new line", async () => {
    const { box, props } = renderInput({ input: "Weekend in Berlin" });
    box.focus();
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("doesn't send while text is being composed with an input method", () => {
    const { box, props } = renderInput({ input: "東京" });
    fireEvent.keyDown(box, { key: "Enter", isComposing: true });
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("doesn't send an empty or blank message", async () => {
    const { box, props } = renderInput({ input: "   " });
    box.focus();
    await userEvent.keyboard("{Enter}");
    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("leaves Enter to a custom key handler when one is given", async () => {
    const onKeyDown = vi.fn();
    const { box, props } = renderInput({ input: "Hi", onKeyDown });
    box.focus();
    await userEvent.keyboard("{Enter}");
    expect(onKeyDown).toHaveBeenCalled();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("gives the text box to an outside ref (e.g. to focus it)", () => {
    const inputRef = createRef<HTMLTextAreaElement>();
    renderInput({ inputRef });
    expect(inputRef.current).toBe(screen.getByRole("textbox"));
  });
});

describe("ChatInput — growing with the text", () => {
  // jsdom doesn't lay out text, so the box's measurements are stood in for,
  // as in the real box: the text needs 24px per line plus 24px of padding
  // (scrollHeight), and the box has a 1px border above and below
  // (offsetHeight is 2px more than clientHeight)
  const measurements = {
    scrollHeight(this: HTMLTextAreaElement) {
      return this.value.split("\n").length * 24 + 24;
    },
    clientHeight: () => 100,
    offsetHeight: () => 102,
  };

  beforeAll(() => {
    for (const [name, get] of Object.entries(measurements)) {
      Object.defineProperty(HTMLTextAreaElement.prototype, name, {
        configurable: true,
        get,
      });
    }
  });

  afterAll(() => {
    for (const name of Object.keys(measurements)) {
      delete (
        HTMLTextAreaElement.prototype as unknown as Record<string, number>
      )[name];
    }
  });

  it("starts one line high, border included, so it doesn't scroll", () => {
    const { box } = renderInput();
    expect(box).toHaveAttribute("rows", "1");
    // 24px line + 24px padding + 2px border
    expect(box.style.height).toBe("50px");
  });

  it("grows to fit the text", () => {
    const { box } = renderInput({ input: "Day 1\nDay 2\nDay 3" });
    expect(box.style.height).toBe("98px");
  });

  it("shrinks back when the text is cleared after sending", () => {
    const { box, rerender, props } = renderInput({
      input: "Day 1\nDay 2\nDay 3",
    });
    rerender(<ChatInput {...props} input="" />);
    expect(box.style.height).toBe("50px");
  });

  // The max-height in pixels (1rem = 16px), however the calc() is written
  const maxHeightPx = (box: HTMLElement) =>
    [...box.style.maxHeight.matchAll(/([\d.]+)(rem|px)/g)].reduce(
      (sum, [, value, unit]) => sum + Number(value) * (unit === "rem" ? 16 : 1),
      0,
    );

  it("stops growing at the given number of lines, then scrolls", () => {
    const { box } = renderInput({ maxRows: 6 });
    // 6 lines of 24px + 24px padding + 2px border
    expect(maxHeightPx(box)).toBe(170);
    expect(box).toHaveClass("overflow-y-auto");
  });

  it("allows 4 lines when no maximum is given", () => {
    const { box } = renderInput();
    // 4 lines of 24px + 24px padding + 2px border
    expect(maxHeightPx(box)).toBe(122);
  });

  it("hides the scrollbar, also when the text is longer than the maximum", () => {
    const { box } = renderInput();
    // Firefox and current Chrome / Edge; older Chrome and Safari
    expect(box).toHaveClass("[scrollbar-width:none]");
    expect(box).toHaveClass("[&::-webkit-scrollbar]:hidden");
  });
});
