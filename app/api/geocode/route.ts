import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { cityName } = await request.json();

    if (!cityName) {
      return NextResponse.json(
        { error: "City name is required" },
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

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityName as string)}&key=${apiKey}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Geocoding API failed: ${response.statusText}`, errorText);
      return NextResponse.json(
        { error: `Geocoding failed: ${response.statusText}` },
        { status: response.status },
      );
    }

    const data = await response.json();

    return NextResponse.json({
      geometries:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.results?.map((result: any) => ({
          viewport: result.geometry?.viewport,
          location: result.geometry?.location,
        })) || [],
    });
  } catch (error) {
    console.error("Error in geocode API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
