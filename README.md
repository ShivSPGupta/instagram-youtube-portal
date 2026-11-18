# Instagram to YouTube Portal

A React and Express application for browsing media from an Instagram professional account authorized with Meta Unified Login, selecting posts, and publishing supported media to a connected YouTube channel.

## What the application supports

- Meta Unified Login with Instagram professional accounts shared with the app.
- Instagram account profile and media retrieval through Meta's Graph API.
- Selection and publishing of up to 10 Instagram posts per batch.
- Google OAuth for connecting a YouTube channel.
- Direct YouTube upload for supported Instagram videos.
- Conversion of supported Instagram images to five-second, silent MP4 videos with FFmpeg before upload.
- Unlisted YouTube uploads by default; configure another privacy status if desired.
- Dashboard status, upload results, and recent upload history.

### Instagram access limitation

The official Meta API does **not** provide arbitrary public-profile lookup by username for this integration. Users can enter a username or profile URL, but it must match an Instagram professional account authorized and shared with the app. Personal accounts and unrelated public accounts cannot be fetched. This application does not scrape Instagram and does not use Selenium, Playwright, or browser automation.

Instagram carousel posts and media formats that the upload processor does not support cannot be published.

## Requirements

- Node.js 20 or newer.
- A Meta app configured for Facebook Login for Business / Instagram API with Unified Login.
- A Google Cloud project with the YouTube Data API v3 enabled and OAuth credentials configured.
- The YouTube OAuth user must have a YouTube channel and be allowed by the Google OAuth consent configuration.

## Configure the server

Create `server/.env` from `server/.env.example` and fill in the credentials locally. Do not commit `.env` or share app secrets, OAuth client secrets, or access tokens.

### Meta

Set:

- `META_APP_ID` and `META_APP_SECRET` to the **Meta app** credentials used by Unified Login.
- `META_INSTAGRAM_EMBED_URL` to the Unified Login URL copied from the Meta configuration. It includes the appropriate `config_id`.
- `META_CALLBACK_URL` to the public backend callback URL, for example `https://your-ngrok-host.ngrok-free.dev/api/instagram/callback`.
- `META_INSTAGRAM_API_HOST=https://graph.facebook.com`.
- `META_API_VERSION` to the Graph API version configured for your app.

Register the exact `META_CALLBACK_URL` with Meta. It must match the redirect URI sent during authorization and code exchange.

### Google / YouTube

Set:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- `GOOGLE_CALLBACK_URL` to the backend callback URL, for example `https://your-ngrok-host.ngrok-free.dev/api/youtube/callback`.
- `CLIENT_URL` to the URL where the React app is open. For local development, this is commonly `http://localhost:5173`.
- `YOUTUBE_DEFAULT_PRIVACY` to `private`, `unlisted`, or `public` (defaults to `unlisted`).

Add the exact `GOOGLE_CALLBACK_URL` to the OAuth client's authorized redirect URIs in Google Cloud. The backend requests `youtube.upload` and `youtube.readonly` scopes with offline access, and uploads through YouTube Data API `videos.insert`.

If the frontend and backend are on the same development computer, the frontend can call the local backend using `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

In that arrangement, Meta and Google still need the publicly reachable ngrok callback URLs, and ngrok must forward to the backend port. If the frontend is accessed from another device, configure `VITE_API_URL` to a backend address reachable by that device.

## Run locally

Open two terminals:

```powershell
cd server
npm install
npm run dev
```

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. Connect Instagram and YouTube from their respective pages, then select Instagram posts and publish them.

## Validation

```powershell
cd server
npm test
```

```powershell
cd client
npm run lint
npm run build
```

## Current storage limitations

OAuth tokens, connected account state, and upload history are currently kept in server memory. They are lost when the server restarts, are not isolated per application user, and are not suitable for a multi-instance production deployment. A production deployment should add authenticated user sessions, encrypted durable token storage, token refresh/revocation handling, and persistent upload records.
