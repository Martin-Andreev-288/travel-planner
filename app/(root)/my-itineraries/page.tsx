import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AuthPrompt from "@/app/components/auth-prompt";
import ItineraryCard from "./itinerary-card";

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

  const itineraries = await prisma.itinerary.findMany({
    where: { userId: session.user!.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2c3e50]">🗺️ My Itineraries</h1>
        <p className="mt-2 text-gray-600">
          {itineraries.length === 0
            ? "You haven't saved any itineraries yet. Start chatting to plan a trip!"
            : `${itineraries.length} saved ${itineraries.length === 1 ? "itinerary" : "itineraries"}`}
        </p>
      </div>

      {itineraries.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {itineraries.map((itinerary) => {
            const dates = itinerary.items
              .map((item) => item.date)
              .filter((d): d is string => !!d)
              .sort();

            const dateRange =
              dates.length === 0
                ? "No dates set"
                : dates.length === 1 || dates[0] === dates[dates.length - 1]
                  ? new Date(dates[0]).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : `${new Date(dates[0]).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(dates[dates.length - 1]).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

            const cities = [
              ...new Set(itinerary.items.map((item) => item.city)),
            ];

            const savedOn = itinerary.createdAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });

            return (
              <ItineraryCard
                key={itinerary.id}
                id={itinerary.id}
                title={itinerary.title}
                dateRange={dateRange}
                cities={cities}
                activityCount={itinerary.items.length}
                savedOn={savedOn}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
