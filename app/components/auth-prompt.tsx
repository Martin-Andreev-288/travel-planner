import Link from "next/link";

interface AuthPromptProps {
  featureName: string;
  description?: string;
}

const AuthPrompt = ({ featureName, description }: AuthPromptProps) => {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
        {/* Lock Icon */}
        <div className="mb-6 text-6xl">🔒</div>

        {/* Heading */}
        <h2 className="mb-3 text-2xl font-bold text-[#2c3e50]">
          Sign in to access {featureName}
        </h2>

        {/* Description or fallback */}
        <p className="mb-6 leading-relaxed text-gray-600">
          {description ||
            "Create a free account or sign in to start planning your next trip."}
        </p>

        {/* Auth Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign-in"
            className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Create Account
          </Link>
        </div>

        {/* Subtle footer note */}
        <p className="mt-6 text-xs text-gray-400">
          Free to join — start exploring in seconds.
        </p>
      </div>
    </div>
  );
};

export default AuthPrompt;
