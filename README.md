# Route Board

Route Board is a Vite + React display application for live dispatch boards. It renders route assignments, available and unavailable trucks, driver availability, and Fleetio pre-trip/post-trip inspection status for multiple companies.

## Stack

- React 19
- Vite 7
- Netlify Functions
- ESLint 9

## Companies

The app supports company-specific configuration through URL detection and environment variables.

- `kcd`
- `mhd`

The active company is derived from:

1. `?company=kcd` or `?company=mhd`
2. The hostname
3. The pathname
4. Fallback to `kcd`

## Local Development

Install dependencies:

```bash
npm install
```

Run the app with Netlify dev so the frontend and serverless functions are both available:

```bash
npx netlify dev
```

The local board runs at:

```text
http://localhost:8888
```

## Environment Variables

Create a local env file or set these in Netlify:

```text
VITE_ROUTEBOARD_API_URL_KCD=
VITE_ROUTEBOARD_API_URL_MHD=
FLEETIO_API_KEY=
FLEETIO_ACCOUNT_TOKEN_KCD=
FLEETIO_ACCOUNT_TOKEN_MHD=
```

## Fleetio Integration

The Netlify function at `netlify/functions/fleetio-trip-status.js` fetches submitted inspection forms from Fleetio and returns a driver+truck keyed trip-status map for the current board date.

Current inspection behavior:

- Left cap is green when a matching pre-trip exists for the driver and assigned truck.
- Right cap is gray when no current-cycle post-trip exists.
- Right cap is yellow when post-trips exist without a preceding pre-trip.
- Right cap is green when a post-trip exists after the latest pre-trip.

Truck identifiers are normalized so numeric trucks like `0846` and `846` match, while mixed identifiers like `P-5` remain stable across the UI and Fleetio.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Project Structure

```text
src/
  components/    UI building blocks
  hooks/         data-fetching and view-model hooks
  styles/        CSS modules by feature area
  utils/         formatting, normalization, grid, and truck helpers
netlify/
  functions/     Fleetio serverless integration
```
