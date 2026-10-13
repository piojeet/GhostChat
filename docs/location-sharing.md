# GhostChat location sharing

## Client and map setup

- Android and iOS render an interactive Leaflet map in `react-native-webview`.
  Leaflet 1.9.4's JavaScript and CSS are bundled locally with the app; its BSD
  license is in `src/features/map/assets/LEAFLET-LICENSE.txt`. Base map
  imagery uses the public OpenStreetMap raster tile service:
  `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. No Google Maps SDK, API key,
  or billing account is required for the map.
- iOS autolinks `react-native-webview`; run CocoaPods installation on macOS
  before the first iOS build after dependency changes.
- An internet connection is required to load map tiles. The app does not
  prefetch tiles, scrape the service, or provide offline downloads. Use the OSM
  tile service according to its
  [tile usage policy](https://operations.osmfoundation.org/policies/tiles/);
  requests use the stable `GhostChat/1.0` User-Agent, honor WebView's normal
  HTTP caching, and show attribution as `© OpenStreetMap contributors`.
- The Android Google Maps manifest key and Gradle resource configuration have
  been removed. Firebase configuration and foreground location permissions are
  independent and remain in place.
- Place search is not connected to a Places provider. The Map search field can
  filter authorized shared friends by username/display name.
- Friend locations are approximate coordinates. Named places or addresses
  require a reverse-geocoding provider; none is configured.
- Location is foreground-only and sampled on user action. No background
  location permission or continuous tracking is requested.
- Friend locations currently show coordinates on the map. Named places or
  addresses require a reverse-geocoding provider; none is configured.
- Location is foreground-only and sampled on user action. No background
  location permission or continuous tracking is requested.

## Authenticated API

All endpoints require the existing bearer-token middleware:

- `GET /api/locations/me/preferences` returns the signed-in user's sharing and
  Ghost Mode preferences, without coordinates.
- `PATCH /api/locations/me/preferences` accepts
  `{ "sharingEnabled": boolean, "ghostMode": boolean }`. Location sharing
  cannot be enabled while Ghost Mode is enabled. Turning sharing off or
  enabling Ghost Mode deletes the stored location.
- `PUT /api/locations/me` accepts only finite latitude/longitude values within
  geographic ranges. It rejects updates unless the signed-in user has opted
  into sharing and Ghost Mode is off.
- `GET /api/locations/friends` returns locations only for accepted, unblocked
  friends who enabled sharing and are not in Ghost Mode. It excludes expired
  records, rounds coordinates to three decimal places, and labels records
  older than one hour as stale.

Writes have a dedicated rate limit of six requests per minute in addition to
the general API limit. Location records expire after 12 hours; reads also
filter by expiry so they are hidden before MongoDB's TTL cleanup runs.
