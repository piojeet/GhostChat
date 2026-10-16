# Android friend-testing release

Do not share a release APK until the public backend and release signing key are
configured. Gradle checks both before starting the Android release build. The
release app also rejects missing, non-HTTPS, localhost, emulator, and private
network API URLs instead of silently falling back to a development server.

## Deploy the backend

Deploy the `server` Node.js service on a publicly reachable host using Node.js
22.11 or later. Terminate TLS at the host or reverse proxy, route `/api` to the
Express service, and allow Socket.IO WebSocket upgrades on the same hostname.
Expose `GET /health` for health checks and keep the server process running.
MongoDB Atlas must allow connections from the backend host.

Set these backend environment variables in the hosting provider's secret/config
store:

- `PORT` (or use the provider's assigned port)
- `NODE_ENV=production`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (different random values, each
  at least 32 characters)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` for
  account verification codes
- `CLIENT_URL` set to the HTTPS client origin used by the server's CORS policy

For media uploads, configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET`. For push notifications, configure both
`FIREBASE_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS`; upload the service
account JSON to the host's secret storage and point to its mounted file path.
Never put that JSON file in the app, the repository, or a public deployment
artifact. The Firebase Android client file is separate and must remain
registered to `com.ghostchat`.

`STUN_URLS` has a default. For reliable calls across restrictive networks, set
`TURN_URLS` and `TURN_SHARED_SECRET` together. `OTP_EXPIRES_MINUTES` is optional
and defaults to 10.

After deployment, confirm `https://<backend-host>/health` returns HTTP 200 and
that the host accepts HTTPS requests to `/api` plus Socket.IO WebSocket
connections. Use that same host in the app's API URL; Socket.IO derives its
origin from the API base URL.

## Configure and sign the Android release

Set `API_BASE_URL` in an ignored release-specific `.env.release` file to the
deployed endpoint, including `/api`, for example:

```dotenv
API_BASE_URL=https://api.example.com/api
```

Keep `.env.release` and `.env` out of Git. Do not put backend credentials,
service-account paths, keystore passwords, or private keys in either file;
React Native config values are packaged into the app.

If no release key exists, create a **new test-release key only after choosing
and protecting a secure backup location outside the repository**. Do not
overwrite an existing production key. In PowerShell, `keytool` prompts for the
passwords rather than exposing them in the command:

```powershell
keytool -genkeypair -v -keystore "$env:USERPROFILE\ghostchat-release.jks" -alias ghostchat -keyalg RSA -keysize 4096 -validity 10000
```

Keep the `.jks` file backed up securely and never regenerate it for updates to
the same distributed app. Supply Gradle with the following values through the
user-level `%USERPROFILE%\.gradle\gradle.properties` file (outside the
repository), or through the matching process environment variables:

```properties
RELEASE_STORE_FILE=C:/Users/<you>/ghostchat-release.jks
RELEASE_STORE_PASSWORD=<keystore password>
RELEASE_KEY_ALIAS=ghostchat
RELEASE_KEY_PASSWORD=<key password>
```

This workspace now has a dedicated friend-testing key at
`%USERPROFILE%\ghostchat-friend-testing.p12`; its randomly generated signing
values are stored in `%USERPROFILE%\.gradle\gradle.properties` with restricted
Windows permissions. Back up the key and its matching signing settings
securely. This is a test-distribution key, not a production/Play App Signing
key; do not publish it or commit either file.

Build the installable APK from the repository root, selecting the release
configuration without changing the local development `.env`:

```powershell
$env:ENVFILE = ".env.release"
.\android\gradlew.bat -p android :app:assembleRelease -PreactNativeDevServerIp=disabled
$env:ENVFILE = $null
```

The `reactNativeDevServerIp` override prevents React Native from embedding the
build machine's LAN address in the release resources. Release builds have
developer support disabled and use the HTTPS API URL above.

The generated APK is
`android\app\build\outputs\apk\release\app-release.apk`. The release build
includes the React Native JavaScript bundle; friends do not need Metro, a USB
connection, or developer tools. The API and signing checks must pass first.

## Install and test with two accounts

1. Copy the APK to both Android phones and open it. If prompted, allow the
   browser or file manager to install unknown apps, then confirm installation.
2. Create separate accounts with different email addresses on the two phones
   and complete email verification.
3. Send a friend request from one account and accept it from the other.
4. Send a text message and verify it appears on both phones. Then send a photo
   and video Snap, open it on the recipient phone, and verify image/video media
   uploads and playback.
5. Grant notification permission on the recipient phone. Background the app,
   send another message, and verify notification delivery. Actual FCM delivery
   also requires working Firebase server credentials.
6. Test camera photo/video capture and gallery selection on each phone. Test
   location only after both users explicitly enable sharing; location requires
   device permission and internet access for map tiles.

## Verification boundaries

Type checks, lint, unit tests, and a successful APK build do not prove live
email delivery, FCM delivery, account verification, MongoDB access, image
storage, WebSocket connectivity, GPS behavior, or camera hardware support.
Verify those on two physical devices against the deployed backend before
sharing the APK more broadly.
