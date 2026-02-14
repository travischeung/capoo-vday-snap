# Happy Valentine's Day! Capoo Valentine's Day Snap (like pokemon snap)

A playful React + Vite Valentine's web experience with:

- a gated home screen
- a photo "camera game" with polaroid captions
- a final album page with animated backgrounds and effects
- automatic caption export as JSON at the end

## Tech Stack

- React 18
- React Router
- Vite

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run locally

```bash
npm run dev
```

### 3) Build for production

```bash
npm run build
```

### 4) Preview production build

```bash
npm run preview
```

## App Flow

1. **Home (`/`)**
   - User enters the 4-digit code.
   - On success, an intro GIF plays briefly.
2. **Game (`/game`)**
   - User takes 10 shots.
   - Each shot shows a polaroid and allows caption entry.
   - Final shot button changes to **develop**.
3. **Final Album (`/valentines`)**
   - Shows the completed photo gallery.
   - Animated backgrounds/effects play.
   - Captions are auto-exported to a downloaded JSON file.

## Configuration

Main content configuration lives in:

- `src/config.ts`

You can edit:

- `PHOTO_PATHS`: image sequence for captured photos
- `WORLD_PATHS`: in-game background sequence
- `GATE_ACCESS_CODE`: home gate code
- `TOKEN_DERIVATION_SECRET`: token derivation seed

### Cloudinary / Env-based URLs (recommended)

For photo privacy, you can keep personal photos out of this repo and inject URLs at runtime with Vite env vars.

1. Copy `.env.example` to `.env.local`
2. Fill in your Cloudinary URLs

```bash
cp .env.example .env.local
```

```bash
# comma-separated
VITE_PHOTO_URLS=https://res.cloudinary.com/<cloud>/image/upload/v1/photo1.jpg,https://res.cloudinary.com/<cloud>/image/upload/v1/photo2.jpg

# optional world/background URLs
VITE_WORLD_URLS=https://res.cloudinary.com/<cloud>/image/upload/v1/bg1.jpg,https://res.cloudinary.com/<cloud>/image/upload/v1/bg2.jpg
```

Supported formats for each env var:

- comma-separated list
- newline-separated list
- JSON array string

If env vars are empty, the app falls back to local defaults from `src/config.ts`.

## Assets

Place media assets in `public/` so they are served at root-relative URLs:

- photos: `public/photos/...` -> `/photos/...`
- world backgrounds: `public/background/...` -> `/background/...`
- effects/gifs: `public/assets/...` -> `/assets/...`

## Caption Export

At the final album page, captions are exported automatically as:

- `valentines-captions-YYYY-MM-DD.json`

The export includes:

- timestamp
- total photos
- array of shot number, photo path, and caption

## Notes

- Returning to `/` resets the experience state.
- Most temporary run data is stored in `localStorage` during play.
