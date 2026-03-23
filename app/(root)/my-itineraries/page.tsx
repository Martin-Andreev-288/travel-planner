import { auth } from "@/auth";
import AuthPrompt from "@/app/components/auth-prompt";

export default async function MyItinerariesPage() {
  const session = await auth();

  if (!session) {
    return (
      <AuthPrompt
        featureName="My Itineraries"
        description="Sign in to view and manage your saved travel plans and itineraries."
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2c3e50]">🗺️ My Itineraries</h1>
        <p className="mt-2 text-gray-600">
          Welcome, {session.user?.name}! This feature is coming soon.
        </p>
      </div>

      <div className="rounded-xl bg-white p-8 shadow-lg">
        <p className="text-center text-gray-500">
          The saved travel plans and itineraries will appear here.
        </p>
      </div>
    </div>
  );
}
