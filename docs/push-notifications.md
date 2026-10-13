# Push notifications

Notifications are persisted in MongoDB and sent through Firebase Cloud Messaging (FCM). Actor notifications include the trusted sender ID and public avatar URL from the backend user record. Android actor and system alerts use high-priority data messages and are displayed by Notifee in both foreground and background. Incoming chats use Android MessagingStyle with the remote sender's person icon and message preview. Android downloads HTTPS avatars to a 30-day local cache with a seven-second network timeout and a 5 MB limit, following HTTPS redirects and validating the response MIME type, image signature, and decoded dimensions. Logs include only the notification path, avatar presence, HTTP status, content type, download result, and selected icon source. The cached sender image is provided to both the Android MessagingStyle person icon and `largeIcon`. Missing or unavailable images use the bundled neutral profile drawable. The GhostChat monochrome drawable remains the Android small status-bar icon, which Android may continue to show in the leftmost app-icon position. iOS alerts and Android incoming-call alerts retain their FCM notification delivery. All platforms continue using the existing sound routing; Android uses the existing stable channels. The sender's device plays a separate local message-sent cue only after the server accepts the message.

Push delivery is disabled until a Firebase project and platform credentials are configured. Without them, messages still persist and in-app notifications remain available, but no OS notification can be sent.

## Firebase setup

1. Create a Firebase project and enable Cloud Messaging.
2. Register an Android app with application ID `com.ghostchat`. Download `google-services.json` to `android/app/google-services.json`.
3. For iOS, register the bundle identifier configured in the Xcode target and add the matching `GoogleService-Info.plist` to the `SnapApp` target. Configure an APNs authentication key in Firebase and enable Push Notifications for the Apple app/provisioning profile.
4. Create a Firebase service account with permission to send FCM messages. Store its JSON file outside the repository; never commit or share it. Set `FIREBASE_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS` in the server environment to the project ID and absolute path of this service-account file.
5. Restart the backend after setting these values. On login, the app requests notification permission and registers its FCM token with the authenticated account. On logout, it removes that token from the account.

The app requests notification permission at runtime and creates these stable Android channels before registering its FCM token:

| Event | Channel ID | Sound resource |
| --- | --- | --- |
| Incoming chat message | `message_received_v1` | `message_received.wav` |
| Incoming Snap | `snap_received_v1` | `snap_received.wav` |
| Friend request | `friend_request_v1` | `friend_request.wav` |
| Friend suggestion (reserved; no producer currently exists) | `friend_suggestion_v1` | `friend_suggestion.wav` |
| Incoming audio call | `incoming_audio_call_v1` | `incoming_call.wav` |
| Incoming video call | `incoming_video_call_v1` | `incoming_video_call.wav` |
| Other/system | `system_default_v1` | Android default |

Android preserves a channel's sound, importance, and other settings after creation. Changing a sound for existing installs may require a new channel ID or the user to change Android settings. App code cannot override a channel muted or changed by the user. Existing `messages` and `calls` channels are left intact for compatibility. Friend suggestions currently have no notification event producer, so their channel is only a foundation and no suggestion push is sent.

The short WAV cues are distinct assets packaged in Android `res/raw` and the iOS app bundle. iOS requires working APNs credentials for FCM to deliver alerts. iOS sound behavior also remains subject to system/user settings.

Incoming calls continue to use the existing call/ringtone flow while the app is foregrounded; foreground FCM call alerts are suppressed to avoid a duplicate banner. Outgoing message sound is local-only, plays after successful REST persistence, and is not triggered by a socket echo or a failed request.

## Development and verification

- Rebuild Android after adding Firebase config or changing native dependencies: `npx react-native run-android`.
- On macOS, install iOS pods with `cd ios && pod install`, then rebuild the iOS app.
- Run backend `npm --prefix server run build` and mobile `npx tsc --noEmit -p tsconfig.json`.
- Test with two real accounts on separate devices. Grant notifications on the recipient device, log in, background/close the app, then send a chat message from the other account. Verify the notification text and sound. Also test foreground delivery and denied permission.

Force-stopping an Android app from system settings may block all FCM delivery until the app is opened again. iOS delivery depends on APNs and device notification settings. Push notifications do not guarantee delivery when the OS, user settings, network, or Firebase/APNs infrastructure prevents it.
