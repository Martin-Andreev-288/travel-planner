# Travel Planner

## Welcome to the AI-Powered Travel Planner!

### Purpose and Objectives

Travel Planner is an AI-assisted trip planning application that helps users build detailed, day-by-day travel itineraries through a natural chat interface. Instead of manually researching and organizing a trip, users simply describe where they want to go and what they want to do — the AI handles the rest, placing activities on an interactive map with routes between them.

### Audience

Designed for travelers of all kinds — from weekend adventurers to long-haul explorers — who want a smarter, faster way to plan trips. The app is especially useful for anyone who has struggled to coordinate multiple destinations, logistics, and schedules into a single coherent itinerary.

## Technologies Used

- Next.js 15 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- MapLibre GL / react-map-gl
- Vercel AI SDK
- Google Gemini 2.5 Flash
- Google Maps API (Geocoding & Places)
- Prisma ORM
- PostgreSQL
- NextAuth v5
- Lucide React
- React Markdown
- Vitest
- React Testing Library
- ESLint
- Prettier

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```
DATABASE_URL=your_postgresql_connection_string
AUTH_SECRET=your_nextauth_secret           # generate with: openssl rand -base64 32
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

## How to Run the Project

1. Clone the repository: [Project Repository Link](https://github.com/Martin-Andreev-288/travel-planner)

```
git clone https://github.com/Martin-Andreev-288/travel-planner.git
```

2. Install the app packages

```
npm install
```

3. Set up the database

```
npx prisma db push
```

4. (Optional) Seed the database with sample data

```
npx tsx db/seed.ts
```

5. Run the application

```
npm run dev
```

## Running Tests

To run unit and integration tests:

```
npm run test
```

## App Folder Structure

- `app/(auth)/` — sign-in and sign-up pages with credential-based authentication.

- `app/(root)/` — main application pages: home (chat + map + itinerary) and the saved itineraries list and detail views.

- `app/actions/` — server actions for creating, updating, and deleting itineraries and their items.

- `app/api/` — API routes: `/api/chat` (AI streaming), `/api/geocode` (city coordinates), `/api/places` (Google Places autocomplete), `/api/auth` (NextAuth handler).

- `app/components/` — UI components including the chat interface, map markers, itinerary panel, welcome card, and shared components like the header and confirm dialog.

- `lib/` — Prisma client setup, utility functions, and validation schemas.

- `prisma/` — database schema (PostgreSQL via Prisma ORM).

- `db/` — seed script and sample data.

- `utils/` — helper utilities for map markers, route drawing, and Places API integration.

## Project Tool Links

- [GitHub Link](https://github.com/Martin-Andreev-288/travel-planner)
- [Project deploy in Vercel](https://travel-planner-delta-taupe.vercel.app/)
- [Demo Video](https://www.youtube.com/watch?v=kkeXGstKnIE)
