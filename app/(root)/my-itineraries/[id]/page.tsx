import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ItineraryDisplay from "@/app/components/itinerary";
import { TravelItineraryItem } from "@/app/api/chat/itinerary-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const itinerary = await prisma.itinerary.findUnique({
    where: { id },
    select: { title: true },
  });

  return { title: itinerary?.title ?? "Itinerary" };
}

export default async function ItineraryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const { id } = await params;

  const itinerary = await prisma.itinerary.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!itinerary || itinerary.userId !== session.user.id) {
    redirect("/my-itineraries");
  }

  // Convert DB items to TravelItineraryItem shape
  const items: TravelItineraryItem[] = itinerary.items.map((item) => ({
    id: item.id,
    name: item.name,
    city: item.city,
    location: item.location ?? undefined,
    date: item.date ?? undefined,
    startTime: item.startTime ?? undefined,
    endTime: item.endTime ?? undefined,
  }));

  // Group by date (same logic as page.tsx)
  const groupedItems = items.reduce<Record<string, TravelItineraryItem[]>>(
    (groups, item) => {
      const date = item.date
        ? new Date(item.date).toLocaleDateString(undefined, {
            dateStyle: "medium",
          })
        : "Unscheduled";
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    },
    {},
  );

  // Sort items in each group by start time
  Object.keys(groupedItems).forEach((date) => {
    groupedItems[date].sort((a, b) => {
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <Link
        href="/my-itineraries"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <ArrowLeft size={16} />
        Back to My Itineraries
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-[#2c3e50] sm:text-3xl">
        {itinerary.title}
      </h1>

      <ItineraryDisplay groupedItems={groupedItems} />
    </div>
  );
}
