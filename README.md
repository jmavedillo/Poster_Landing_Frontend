# Poster Landing Frontend

Frontend for a music-poster product built with Next.js and React. This repository includes:
- A marketing/landing experience (`/`)
- Poster generator UI routes (`/create` and `/create-2`) that search tracks and request poster previews/renders from a backend API

## Project overview

The app is designed as a lightweight frontend that focuses on user experience and delegates heavy poster generation logic to a backend service.

Core user flows:
1. Browse the landing page and view example posters.
2. Open one of the generator pages (`/create` or `/create-2`).
3. Search artist + song.
4. Generate a preview.
5. Export a final poster image.

## Architecture

This project uses the Next.js App Router (`app/` directory).

### High-level structure

- `app/layout.tsx` – Root layout, global fonts, and shell HTML.
- `app/page.tsx` – Landing page.
- `app/components/PosterExamples.tsx` – Reusable poster examples section on landing page.
- `app/create/page.tsx` – Template 1 generator route (`spotify-player-v1`).
- `app/create-2/page.tsx` – Template 2 generator route (`minimal-clean-v1`).
- `app/create/CreatePosterClient.tsx` – Client-side poster generator experience (search, preview, export).
- `app/create/posterModel.ts` – Typed request model and payload builder for poster rendering.
- `public/` – Static assets and example images.

### Frontend responsibilities

- User input handling (artist/song search)
- Debounced API requests for search
- Preview and export actions
- Displaying loading/error states
- Building render payloads in a typed format

### Backend responsibilities (external service)

- Artist and track search
- Poster preview generation
- Final poster rendering/export output

## Environment variables

Create a `.env.local` file in the project root.

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Variable reference

- `NEXT_PUBLIC_API_BASE_URL`
  - Base URL for the backend poster API.
  - Must include protocol and host (and port if needed).
  - Used on the client, so it is intentionally `NEXT_PUBLIC_*`.
  - Defaults to `http://localhost:3001` if not set.

## Connection to backend API

The generator UI calls the backend using `NEXT_PUBLIC_API_BASE_URL`.

Expected endpoints:

- `GET /api/artists?q=<artistQuery>`
  - Returns artist suggestions.
- `GET /api/tracks?q=<songQuery>&artistName=<optionalArtistName>`
  - Returns matching tracks.
- `POST /api/posters/preview`
  - Accepts poster payload and returns preview HTML/content.
- `POST /api/posters/render`
  - Accepts poster payload and returns a render result for export.

If the frontend cannot reach the API, the UI shows an actionable error instructing you to set `NEXT_PUBLIC_API_BASE_URL` correctly.

## Local development

### Prerequisites

- Node.js 20+
- npm

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

Then open: [http://localhost:3000](http://localhost:3000)

### Other scripts

```bash
npm run lint
npm run build
npm run start
```

## Vercel deployment

This app is optimized for deployment on Vercel.

### Recommended setup

1. Import this repository into Vercel.
2. Framework preset: **Next.js** (auto-detected).
3. Set environment variable in Vercel project settings:
   - `NEXT_PUBLIC_API_BASE_URL=<your-backend-api-url>`
4. Deploy.

### Notes

- Ensure CORS is configured on the backend to allow requests from your Vercel domain.
- Use separate backend URLs for preview environments and production if needed.
- Because `NEXT_PUBLIC_API_BASE_URL` is public, do not place secrets in frontend env vars.

---

Built with Next.js + React, deployed on Vercel.
