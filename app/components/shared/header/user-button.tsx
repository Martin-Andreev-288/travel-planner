"use client";

import { useState, useRef, useEffect } from "react";
import { signOutUser } from "@/app/actions/user-actions";

interface UserButtonProps {
  name: string | null | undefined;
  email: string | null | undefined;
}

export default function UserButton({ name, email }: UserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const firstInitial =
    name?.charAt(0).toUpperCase() || email?.charAt(0).toUpperCase() || "U";

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-600 font-semibold text-white transition-colors hover:bg-gray-500 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-none"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {firstInitial}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {/* User Info */}
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-gray-900">{name}</p>
            <p className="truncate text-sm text-gray-500">{email}</p>
          </div>

          {/* Sign Out */}
          <form action={signOutUser} className="w-full">
            <button
              type="submit"
              className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
