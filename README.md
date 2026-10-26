# English Test (Hello English Classes)

A timed English practice app built with Next.js 15, React 19, and TypeScript.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

## Production build

```bash
npm ci
npm run check
npm start
```

`npm run check` runs the TypeScript check and creates the optimized production build. `npm start` serves that build on port 3000 (set `PORT` if your host assigns a different port).

## Deploy

Import this repository into Vercel, set the framework preset to **Next.js**, and set **Output Directory** to **Override** with the value `.next`. The build command is `npm run build`; no environment variables are required. For another Node.js host, use the production build and start commands above.

Practice content lives in `data/`, question logic in `lib/`, and screens in `components/`.
