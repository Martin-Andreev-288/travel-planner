# Travel Planner

## Welcome to the AI-Powered Travel Planner!

### Purpose and Objectives

Travel Planner is an AI-assisted trip planning application that helps users build detailed, day-by-day travel itineraries through a natural chat interface. Instead of manually researching and organizing a trip, users simply describe where they want to go and what they want to do — the AI handles the rest, placing activities on an interactive map with routes between them.

### Audience

Designed for travelers of all kinds — from weekend adventurers to long-haul explorers — who want a smarter, faster way to plan trips. The app is especially useful for anyone who has struggled to coordinate multiple destinations, logistics, and schedules into a single coherent itinerary.

## Try the App

- **Live app:** [travel-planner-delta-taupe.vercel.app](https://travel-planner-delta-taupe.vercel.app/)
- **No account needed to plan a trip.** Describe the trip in the chat and the AI builds the itinerary. Sign in to save it.
- **Test account:** `admin@example.com` with the password `123456`. Sign in with it to save trips and use every tool, including Notes. The account is shared, so please don't save anything private in it.

## Features

- **Chat with an AI planner:** describe the trip you want, and the AI (Google Gemini) adds, changes and removes activities in the itinerary, with start and end times.
- **Interactive map:** the activities appear as pins, grouped by day, with routes drawn between them.
- **Edit by hand:** add, edit and remove activities yourself in the itinerary panel.
- **Accounts:** sign up and sign in with email and password, or with Google. You can also plan a trip as a guest: it stays in the browser and is kept when you sign in.
- **Saved trips:** signed-in users save their trips, open them later, and rename or delete them.
- **Notes:** personal notes in nested folders, with search, sorting, and moving notes and folders around.
- **Tests:** unit and component tests with Vitest and React Testing Library.

## Technologies Used

- Next.js 15 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- MapLibre GL / react-map-gl
- Vercel AI SDK
- Google Gemini (the Flash-Lite model, set in `app/api/chat/route.ts`)
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

## Requirements

- Node.js 20.19 or newer (22.12+ and 24+ also work)
- A PostgreSQL database
- A Google Maps API key (Geocoding and Places)
- A Google Gemini API key
- Optional, only for "Continue with Google": a Google OAuth client ID and secret

## Environment Variables

Create a `.env` file in the project root with the following variables (the Prisma commands read `.env`, not `.env.local`):

```
DATABASE_URL=your_postgresql_connection_string
AUTH_SECRET=your_auth_secret                  # generate with: openssl rand -base64 32
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
AUTH_GOOGLE_ID=your_google_oauth_client_id            # optional
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret    # optional
```

Never commit this file: it is already listed in `.gitignore`.

## How to Run the Project

1. Clone the repository: [Project Repository Link](https://github.com/Martin-Andreev-288/travel-planner)

```
git clone https://github.com/Martin-Andreev-288/travel-planner.git
cd travel-planner
```

2. Install the app packages (this also generates the Prisma client)

```
npm install
```

3. Create the `.env` file described above

4. Set up the database (creates the tables)

```
npx prisma db push
```

5. (Optional) Seed the database with sample users. **Warning:** the seed script first deletes all existing users, trips and notes, so use it only on an empty development database.

```
npx tsx db/seed.ts
```

6. Run the application, then open http://localhost:3000

```
npm run dev
```

## Running Tests

To run unit and integration tests:

```
npm run test
```

## App Folder Structure

- `app/(auth)/` — sign-in and sign-up pages (email and password, or Google).
- `app/(root)/` — main application pages: home (chat + map + itinerary), the saved itineraries list and detail views, and notes.
- `app/actions/` — server actions for itineraries and their activities, for notes and note folders, and for signing up and in.
- `app/api/` — API routes: `/api/chat` (AI streaming), `/api/geocode` (city coordinates), `/api/places` (Google Places autocomplete), `/api/auth` (NextAuth handler).
- `app/components/` — UI components including the chat interface, map markers, itinerary panel, welcome card, and shared components like the header and confirm dialog.
- `app/utils/` — helper utilities for map markers, route drawing, and Places API integration.
- `lib/` — Prisma client setup, utility functions, validation schemas, and the helpers for the note folder tree.
- `prisma/` — database schema (PostgreSQL via Prisma ORM).
- `db/` — seed script and sample data.

## Project Tool Links

- [GitHub Link](https://github.com/Martin-Andreev-288/travel-planner)
- [Project deploy in Vercel](https://travel-planner-delta-taupe.vercel.app/)
- [Demo Video](https://youtu.be/1KAgItifS9I)
