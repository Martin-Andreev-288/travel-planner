import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { query, city } = await request.json();

    if (!query || !city) {
      return NextResponse.json(
        { error: "Query and city are required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key not found on the server.");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const searchQuery = `${query} in ${city}`;
    const url = `https://places.googleapis.com/v1/places:searchText`;

    const fetchOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.location,places.formattedAddress",
      },
      body: JSON.stringify({ textQuery: searchQuery }),
    };

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error("Google Places API error:", data.error || data);
      const errorMessage =
        data.error?.message ||
        "Failed to fetch place details from Google Places API";
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status || 500 },
      );
    }

    if (!data.places || data.places.length === 0) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const place = data.places[0];

    const placeName = place.displayName?.text;
    const placeLocation = place.location ?? null;

    return NextResponse.json({
      name: placeName,
      location: {
        lng: placeLocation.longitude,
        lat: placeLocation.latitude,
      },
    });
  } catch (error) {
    console.error("Error in places API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
