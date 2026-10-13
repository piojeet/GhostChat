# Audio and video calling

Calling uses the existing authenticated Socket.IO connection for call control and
WebRTC signaling. Calls are foreground-only. Socket events are not push
notifications; incoming calls are not delivered while the app is backgrounded or
terminated.

## Server configuration

Set these variables in the server's private environment (never commit real
credentials):

- `STUN_URLS`: comma-separated STUN URLs. The development default is Google's
  public STUN endpoint and is for development only.
- `TURN_URLS`: comma-separated TURN/TURNS URLs from an operator-controlled
  relay.
- `TURN_SHARED_SECRET`: at least 32 characters and the shared secret configured
  on the TURN server. The API creates one-hour, user-scoped HMAC credentials;
  the shared secret itself is never returned to the app.

Production call starts are refused unless TURN URLs and a shared secret are
configured. STUN-only calls may work on some networks but are not production
reliable. The authenticated endpoint `GET /api/calls/ice-servers` returns ICE
servers and a `relayConfigured` indicator.

## API

All endpoints require the existing `Authorization: Bearer <access-token>`
header.

- `POST /api/calls` with `{ "recipientId": "<friend-id>", "kind": "audio" }`
  or `"video"` starts a call when the recipient has a connected app session.
- `POST /api/calls/:callId/accept`
- `POST /api/calls/:callId/reject`
- `POST /api/calls/:callId/cancel`
- `POST /api/calls/:callId/end`
- `POST /api/calls/:callId/failed`
- `GET /api/calls/history?page=1&limit=20`
- `GET /api/calls/ice-servers`

The mobile app starts and controls calls through Socket.IO. The REST endpoints
are available for authenticated clients and call history.

## Socket events

Client events: `call:outgoing`, `call:accept`, `call:reject`, `call:cancel`,
`call:offer`, `call:answer`, `call:ice_candidate`, `call:connected`, `call:end`,
and `call:failed`.

Server events: `call:outgoing`, `call:incoming`, `call:accepted`,
`call:rejected`, `call:cancelled`, `call:offer`, `call:answer`,
`call:ice_candidate`, `call:connected`, `call:ended`, `call:busy`,
`call:unavailable`, `call:failed`, and `call:timeout`.

Signaling is sent only to the other participant's authenticated private user
room after call membership/state validation. SDP and ICE payloads are never
included in call history.

## States and cleanup

Normal transitions are `ringing -> accepted -> connected -> ended`. Ringing may
also finish as `rejected`, `cancelled`, `missed`, `busy`, `unavailable`,
`timeout`, or `failed`; accepted calls may finish as `ended` or `failed`.
MongoDB conditionally applies transitions and a unique active-participant index
prevents conflicting calls across processes. Duration uses server-side
`connectedAt` and `endedAt` timestamps.

Each call also creates one durable call-activity entry in the participants'
chat history. Its state is updated as the call rings, connects, and ends, so
missed, declined, failed, unavailable, and completed calls appear in the same
conversation without creating duplicate entries. Call activity is not a
deletable text message.

Ringing timeout timers and online call signaling use the existing in-memory
Socket.IO process. MongoDB state prevents duplicate active calls. Run one server
instance for calls until shared Socket.IO delivery and instance-aware recovery
are configured; startup marks abandoned active calls as failed/timeout. Do not
scale the call service horizontally by only adding a Socket.IO adapter, because
startup cleanup is currently process-wide.

## Native build and manual verification

`react-native-webrtc` and `react-native-incall-manager` contain native code.
Rebuild/reinstall the app after dependency changes:

```powershell
npm install
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5000 tcp:5000
npx react-native run-android
```

For iOS, from a macOS environment, run `cd ios; pod install`, then rebuild
through Xcode or `npx react-native run-ios`. Runtime microphone and camera
permissions are required.

Use two active, verified accounts that are accepted friends and have not blocked
each other. Keep both apps foregrounded and connected to the same backend. Tap
the phone and video icons in a chat; on the recipient device accept, then check
bidirectional audio/video, mute, speaker, camera off/on, camera switching,
reject, cancel, and end. Check `GET /api/calls/history` for persisted outcomes.
Two-device media behavior and TURN reachability must be verified on the target
networks; TypeScript tests/builds do not prove that a real media session works.
