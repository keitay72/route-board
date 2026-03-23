# Route Board

Route Board is a Vite + React dashboard for live dispatch operations. It displays route assignments, truck availability, driver availability, and Fleetio pre-trip/post-trip status in a board format designed for office TVs and mobile devices.

The app supports multiple companies with company-specific branding and data sources, and it can be deployed as a static frontend with a Netlify serverless function for Fleetio integration.

## What The App Does

- Shows active dispatch routes grouped for fast scanning
- Highlights missing driver or truck assignments on incomplete routes
- Tracks available and unavailable trucks
- Tracks available and unavailable drivers
- Displays Fleetio pre-trip and post-trip completion status on each route tile
- Adapts between a TV board layout and a mobile-friendly card layout
- Auto-refreshes route data on a 15-second interval
- Detects the active company from the URL

## Supported Companies

The board currently supports:

- `kcd`
- `mhd`

The active company is resolved in this order:

1. `?company=kcd` or `?company=mhd`
2. Hostname match
3. Pathname match
4. Fallback to `kcd`

## User Stories

### Dispatch / Operations

- As a dispatcher, I want to see all routes in a single board so I can quickly identify open assignments and completed work.
- As a dispatcher, I want routes grouped in a readable layout so I can scan the board from a distance on a TV display.
- As a dispatcher, I want incomplete routes with missing drivers or trucks to stand out so I can fix staffing or equipment gaps quickly.
- As a dispatcher, I want a message area on the board so I can communicate day-specific notes to the team.

### Fleet / Shop

- As a fleet coordinator, I want to see which trucks are available versus unavailable so I can make assignment decisions quickly.
- As a shop lead, I want unavailable trucks grouped by status so I can understand where equipment constraints are coming from.
- As an operations user, I want assigned trucks excluded from the available list so the spare fleet count stays accurate.

### Driver Readiness

- As an operations manager, I want to see available and unavailable drivers so I can rebalance routes during the day.
- As a dispatcher, I want Fleetio pre-trip and post-trip status on each route so I can spot missing inspection activity without leaving the board.
- As a supervisor, I want the sidebar to rotate between truck and driver information on TV screens so the board can share more context without manual interaction.

### Mobile Access

- As a manager away from the dispatch screen, I want a mobile layout so I can check route status from my phone.
- As a mobile user, I want the same route, truck, driver, and message information in a stacked layout so I can review the full board without needing the TV view.

## Core Features

### Route Board

- Dispatch rows are normalized from upstream API data before rendering.
- Routes are grouped into board items and placed into a fixed grid for the TV layout.
- Mobile view renders the same route information as a vertical list.
- Completed routes are styled differently from active routes.
- Incomplete routes missing a driver or truck are visually flagged.

### Truck Status

- Available trucks are derived from the shop truck list after removing already assigned trucks.
- `kcd` available trucks are split into residential and commercial groupings.
- `mhd` available trucks are grouped by location.
- Unavailable trucks are sorted and grouped for display in both desktop and mobile layouts.

### Driver Status

- Available drivers and unavailable drivers are displayed in sidebar panels on TV.
- The TV sidebar flips between truck information and driver information every 5 seconds.
- Mobile view shows driver lists in dedicated cards.

### Fleetio Integration

The Netlify function at `netlify/functions/fleetio-trip-status.js` fetches submitted inspection forms from Fleetio for the board date and builds a driver-and-truck keyed trip-status map.

Fleetio lookups run only during configured operational windows:

- `4:00 AM` to `6:00 PM`
- Monday through Friday
- Plus the Saturday of any week where one of these holidays falls on a weekday:
- `New Year's Day`
- `Memorial Day`
- `Independence Day`
- `Labor Day`
- `Thanksgiving Day`
- `Christmas Day`
- Plus any extra Saturdays listed in the Fleetio schedule environment variables for special exceptions

When Fleetio is outside operational hours, the frontend skips polling and the Netlify function returns an empty trip map as a backstop.

Current trip-cap behavior:

- Left cap green: matching pre-trip found
- Left cap late state: no matching pre-trip found
- Right cap gray/missing: no current-cycle post-trip found
- Right cap yellow/warn: post-trip exists without a preceding pre-trip
- Right cap green: valid post-trip exists after the latest pre-trip

Truck identifiers are normalized so numeric values like `0846` and `846` match, while mixed identifiers such as `P-5` remain stable.

## Data Flow

1. The active company is derived from the browser URL.
2. The app reads the correct company API URL from environment variables.
3. Route board data is fetched and normalized on a 15-second refresh cycle.
4. The board date is derived from `generatedAt`.
5. Fleetio trip status is fetched for the active company and board date during Fleetio operational hours.
6. Route data and Fleetio status are merged in the UI.

## Expected Route Board Payload

The frontend is flexible about upstream field names and supports several aliases, but the normalized payload shape looks like this:

```json
{
  "generatedAt": "2026-03-17T05:00:00.000Z",
  "message": "Shop meeting at 2 PM",
  "dispatch": [
    {
      "route": "101",
      "city": "Austin",
      "driver": "J. Smith",
      "driverFullName": "John Smith",
      "truck": "846",
      "status": "complete"
    }
  ],
  "unavailableTrucks": ["801", "902"],
  "shopTrucks": ["801", "846", "902", "P-5"],
  "availableDrivers": ["Driver A", "Driver B"],
  "unavailableDrivers": ["Driver C"]
}
```

Recognized aliases include:

- `dispatch`, `routes`, `routeBoard`, `route_board`
- `unavailableTrucks`, `unavailable_trucks`, `trucksUnavailable`
- `shopTrucks`, `shop_trucks`, `trucks`, `fleet`
- `availableDrivers`, `available_drivers`
- `unavailableDrivers`, `unavailable_drivers`

Dispatch rows also accept alias fields for route, city, driver, driver full name, truck, and status.

## Tech Stack

- React 19
- Vite 7
- Netlify Functions
- ESLint 9

## Local Development

Install dependencies:

```bash
npm install
```

Run the app only:

```bash
npm run dev
```

Run the app with Netlify Functions enabled:

```bash
npx netlify dev
```

Typical local URLs:

- Vite dev server: `http://localhost:5173`
- Netlify dev server: `http://localhost:8888`

Use `npx netlify dev` when you need the Fleetio function available locally.

## Environment Variables

Set these in `.env.local` for local development or in Netlify environment settings for deployment:

```bash
VITE_ROUTEBOARD_API_URL_KCD=
VITE_ROUTEBOARD_API_URL_MHD=
VITE_FLEETIO_EXTRA_SATURDAYS=
VITE_FLEETIO_TIME_ZONE=
FLEETIO_API_KEY=
FLEETIO_ACCOUNT_TOKEN_KCD=
FLEETIO_ACCOUNT_TOKEN_MHD=
FLEETIO_EXTRA_SATURDAYS=
FLEETIO_TIME_ZONE=
```

### Variable Notes

- `VITE_ROUTEBOARD_API_URL_KCD`: Route board API URL for KC Disposal
- `VITE_ROUTEBOARD_API_URL_MHD`: Route board API URL for Mountain High Disposal
- `VITE_FLEETIO_EXTRA_SATURDAYS`: Optional comma-separated `YYYY-MM-DD` list of extra operational Saturdays for frontend polling beyond the built-in holiday schedule
- `VITE_FLEETIO_TIME_ZONE`: Optional IANA timezone for Fleetio operational hours in the frontend. Defaults to `America/Chicago`
- `FLEETIO_API_KEY`: Fleetio API token used by the serverless function
- `FLEETIO_ACCOUNT_TOKEN_KCD`: Fleetio account token for KC Disposal
- `FLEETIO_ACCOUNT_TOKEN_MHD`: Fleetio account token for Mountain High Disposal
- `FLEETIO_EXTRA_SATURDAYS`: Optional comma-separated `YYYY-MM-DD` list of extra operational Saturdays for the Netlify function beyond the built-in holiday schedule
- `FLEETIO_TIME_ZONE`: Optional IANA timezone for Fleetio operational hours in the Netlify function. Defaults to `America/Chicago`

Example override:

```bash
VITE_FLEETIO_EXTRA_SATURDAYS=2026-05-23,2026-07-04,2026-09-05
FLEETIO_EXTRA_SATURDAYS=2026-05-23,2026-07-04,2026-09-05
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Deployment Notes

- The frontend is built with Vite.
- Fleetio access is handled server-side through the Netlify function.
- The Fleetio function expects valid environment variables in the deployment environment.
- Static hosting without the Netlify function will render the app, but Fleetio trip status will fail unless an equivalent backend endpoint is provided.

## Project Structure

```text
src/
  components/    UI components for TV and mobile board rendering
  hooks/         data fetching and board state derivation
  styles/        feature-specific CSS files
  utils/         normalization, formatting, date, grid, and truck helpers
  company.js     company detection and branding configuration
netlify/
  functions/     serverless Fleetio integration
public/
  *.png          company logos and watermark assets
```

## Operational Notes

- The board reveals itself once data is available.
- TV layout uses a fixed 5 x 13 grid for route placement.
- Mobile layout shows the same data in stacked cards.
- The board date is derived from `generatedAt`, which also drives Fleetio lookups.
- Fleetio polling runs on a 15-minute interval during active hours only.
- Fleetio responses are cached for 15 minutes by the Netlify function.
- Fleetio active hours default to `4:00 AM` through `6:00 PM`, Monday through Friday, plus built-in holiday Saturdays and any configured extra Saturdays.
- Missing company API URLs will surface a frontend error asking for the correct env configuration.

## Future README Additions You May Want

- Screenshots of TV and mobile layouts
- Example API contract from each upstream system
- Deployment steps for Netlify
- Contribution guidelines
- Change log or release process
