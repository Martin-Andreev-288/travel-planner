"use client";

import { useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Fullscreen,
  Loader2,
  Maximize2,
  Minimize,
  Minimize2,
  X,
} from "lucide-react";
import type { ActionResult } from "./types";
import { useModalDialog } from "./use-modal-dialog";

export type NoteDraft = { title: string; content: string };

interface NoteEditorDialogProps {
  open: boolean;
  heading: string;
  initial: NoteDraft;
  onSave: (draft: NoteDraft) => Promise<ActionResult>;
  onClose: () => void;
}

const toolButton =
  "rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700";

export default function NoteEditorDialog({
  open,
  heading,
  initial,
  onSave,
  onClose,
}: NoteEditorDialogProps) {
  const dialogRef = useModalDialog(open);
  const previewRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [isPreview, setIsPreview] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Set when fullscreen is requested from Write mode: the preview has to be
  // rendered before it can be made fullscreen, so the effect below finishes it
  const [pendingFullscreen, setPendingFullscreen] = useState(false);
  // Checked after mount: `document` doesn't exist during the server render
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCanFullscreen(!!document.fullscreenEnabled);

    const handleChange = () =>
      setIsFullscreen(
        !!previewRef.current &&
          document.fullscreenElement === previewRef.current,
      );
    document.addEventListener("fullscreenchange", handleChange);
    // No manual exit needed on unmount: the browser leaves fullscreen by
    // itself when the fullscreen element is removed from the page
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    if (!pendingFullscreen || !isPreview) return;
    setPendingFullscreen(false);
    void previewRef.current?.requestFullscreen().catch(() => {});
  }, [pendingFullscreen, isPreview]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    if (!isPreview) {
      setIsPreview(true);
      setPendingFullscreen(true);
      return;
    }
    void previewRef.current?.requestFullscreen().catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    const result = await onSave({ title, content });
    setIsSaving(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.message);
    }
  };

  const areaHeight = isExpanded ? "h-[65vh]" : "h-72";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="note-editor-heading"
      className={`m-auto w-[calc(100%-2rem)] rounded-xl border-0 bg-white p-0 shadow-xl backdrop:bg-black/40 ${
        isExpanded ? "max-w-5xl" : "max-w-2xl"
      }`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2
            id="note-editor-heading"
            className="text-xl font-bold text-[#2c3e50]"
          >
            {heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Packing list for Berlin"
            autoFocus
            className="rounded-lg border border-gray-300 px-3 py-2 text-base font-normal text-gray-900 outline-none focus:border-blue-500"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <label
                htmlFor={contentId}
                className="text-sm font-medium text-gray-700"
              >
                Content
              </label>
              <span className="text-xs text-gray-400">Markdown supported</span>
            </div>

            <div className="flex items-center gap-1">
              <div className="mr-1 flex rounded-lg bg-gray-100 p-0.5">
                {[
                  { label: "Write", active: !isPreview },
                  { label: "Preview", active: isPreview },
                ].map(({ label, active }) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setIsPreview(label === "Preview")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded((value) => !value)}
                aria-pressed={isExpanded}
                aria-label={isExpanded ? "Shrink editor" : "Expand editor"}
                title={isExpanded ? "Shrink editor" : "Expand editor"}
                className={toolButton}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              {canFullscreen && (
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label="Read in fullscreen"
                  title={
                    isPreview
                      ? "Read in fullscreen"
                      : "Read in fullscreen (switches to Preview)"
                  }
                  className={toolButton}
                >
                  <Fullscreen size={15} />
                </button>
              )}
            </div>
          </div>

          {isPreview ? (
            <div
              ref={previewRef}
              className={`overflow-y-auto rounded-lg border border-gray-300 bg-white ${
                // Side padding leaves room for the exit button in the corner
                isFullscreen
                  ? "h-screen px-16 py-10"
                  : `${areaHeight} px-4 py-3`
              }`}
            >
              {isFullscreen && (
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label="Exit fullscreen"
                  title="Exit fullscreen"
                  className="fixed top-4 right-4 rounded-lg bg-white/90 p-2 text-gray-600 shadow-md transition-colors hover:bg-gray-100"
                >
                  <Minimize size={18} />
                </button>
              )}
              {content.trim() ? (
                <div
                  // Full width in both views (prose limits lines to ~65
                  // characters by default); larger text in fullscreen
                  className={`prose prose-headings:text-[#2c3e50] prose-a:text-blue-600 max-w-none ${
                    isFullscreen ? "prose-lg" : "prose-sm"
                  }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Links in notes open in a new tab so the note stays open
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noreferrer">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Nothing to preview yet.</p>
              )}
            </div>
          ) : (
            <textarea
              id={contentId}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                "Write anything you want to remember…\n\nTip: **bold**, - lists, # headings, | tables | work too"
              }
              className={`${areaHeight} resize-y rounded-lg border border-gray-300 px-3 py-2 text-base font-normal text-gray-900 outline-none focus:border-blue-500`}
            />
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
