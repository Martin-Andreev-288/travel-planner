import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ItineraryDetail from "./itinerary-detail";

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

  const items = itinerary.items.map((item) => ({
    id: item.id,
    name: item.name,
    city: item.city,
    location: item.location ?? undefined,
    date: item.date ?? undefined,
    startTime: item.startTime ?? undefined,
    endTime: item.endTime ?? undefined,
  }));

  return <ItineraryDetail title={itinerary.title} items={items} />;
}
