# SnapApp Project Tree

This tree includes current project source and configuration. Dependency folders and generated build/cache output are omitted. File groups in braces list individual files.

```text
SnapApp/
|-- __tests__/
|   `-- App.test.tsx
|-- android/
|   |-- app/
|   |   |-- src/main/
|   |   |   |-- java/com/snapapp/
|   |   |   |   |-- MainActivity.kt
|   |   |   |   `-- MainApplication.kt
|   |   |   |-- res/
|   |   |   |   |-- drawable/rn_edit_text_material.xml
|   |   |   |   |-- mipmap-hdpi/{ic_launcher.png, ic_launcher_round.png}
|   |   |   |   |-- mipmap-mdpi/{ic_launcher.png, ic_launcher_round.png}
|   |   |   |   |-- mipmap-xhdpi/{ic_launcher.png, ic_launcher_round.png}
|   |   |   |   |-- mipmap-xxhdpi/{ic_launcher.png, ic_launcher_round.png}
|   |   |   |   |-- mipmap-xxxhdpi/{ic_launcher.png, ic_launcher_round.png}
|   |   |   |   `-- values/{strings.xml, styles.xml}
|   |   |   `-- AndroidManifest.xml
|   |   |-- build.gradle
|   |   |-- debug.keystore
|   |   `-- proguard-rules.pro
|   |-- gradle/wrapper/{gradle-wrapper.jar, gradle-wrapper.properties}
|   |-- build.gradle
|   |-- gradle.properties
|   |-- gradlew
|   |-- gradlew.bat
|   `-- settings.gradle
|-- ios/
|   |-- SnapApp/
|   |   |-- Images.xcassets/
|   |   |   |-- AppIcon.appiconset/Contents.json
|   |   |   `-- Contents.json
|   |   |-- AppDelegate.swift
|   |   |-- Info.plist
|   |   |-- LaunchScreen.storyboard
|   |   `-- PrivacyInfo.xcprivacy
|   |-- SnapApp.xcodeproj/
|   |   |-- xcshareddata/xcschemes/SnapApp.xcscheme
|   |   `-- project.pbxproj
|   |-- .xcode.env
|   `-- Podfile
|-- server/
|   |-- src/
|   |   |-- config/{cloudinary.ts, database.ts, env.ts, socket.ts}
|   |   |-- jobs/{messageCleanup.job.ts, notification.job.ts, storyExpiry.job.ts}
|   |   |-- middlewares/{authMiddleware.ts, errorMiddleware.ts, rateLimitMiddleware.ts, uploadMiddleware.ts}
|   |   |-- modules/
|   |   |   |-- auth/
|   |   |   |-- blocks/
|   |   |   |-- calls/
|   |   |   |-- chat/
|   |   |   |-- discover/
|   |   |   |-- friends/
|   |   |   |-- media/
|   |   |   |-- notifications/
|   |   |   |-- reports/
|   |   |   |-- snaps/
|   |   |   |-- stories/
|   |   |   `-- users/{user.controller.ts, user.model.ts, user.repository.ts, user.routes.ts, user.service.ts, user.types.ts, user.validation.ts}
|   |   |-- sockets/{call.socket.ts, chat.socket.ts, notification.socket.ts}
|   |   |-- utils/{jwt.ts, logger.ts, pagination.ts, password.ts, response.ts}
|   |   |-- app.ts
|   |   |-- routes.ts
|   |   `-- server.ts
|   |-- .env
|   |-- .env.example
|   |-- package.json
|   `-- tsconfig.json
|-- src/
|   |-- assets/{animations/, fonts/, icons/, images/, sounds/}
|   |-- components/
|   |   |-- avatars/
|   |   |-- buttons/
|   |   |-- cards/
|   |   |-- common/
|   |   |-- inputs/
|   |   |-- loaders/
|   |   |-- media/
|   |   |-- modals/
|   |-- navigation/{AuthNavigator.tsx, MainNavigator.tsx, MainTabNavigator.tsx, RootNavigator.tsx}
|   |-- config/{appConfig.ts, env.ts}
|   |-- constants/{api.ts, app.ts, limits.ts, permissions.ts, storage.ts}
|   |-- features/
|   |   |-- auth/
|   |   |   |-- components/{AuthInput.tsx, SocialLoginButton.tsx}
|   |   |   |-- hooks/useAuth.ts
|   |   |   |-- screens/{ForgotPasswordScreen.tsx, LoginScreen.tsx, RegisterScreen.tsx, ResetPasswordScreen.tsx, SplashScreen.tsx, VerifyOtpScreen.tsx, WelcomeScreen.tsx}
|   |   |   |-- services/authService.ts
|   |   |   `-- types/auth.types.ts
|   |   |-- calls/
|   |   |-- camera/
|   |   |   |-- components/{CameraControls.tsx, CameraView.tsx, CaptureButton.tsx, DrawingCanvas.tsx, FilterCarousel.tsx, FlashButton.tsx, FlipCameraButton.tsx, StickerPanel.tsx, TextEditor.tsx, ZoomControl.tsx}
|   |   |   |-- hooks/{useCamera.ts, useFilters.ts, useRecording.ts}
|   |   |   |-- screens/{CameraPreviewScreen.tsx, CameraScreen.tsx, EditSnapScreen.tsx, MediaPreviewScreen.tsx}
|   |   |   |-- services/cameraService.ts
|   |   |   `-- types/camera.types.ts
|   |   |-- chat/
|   |   |   |-- components/{ConversationItem.tsx, ImageMessage.tsx, MessageBubble.tsx, MessageInput.tsx, SeenStatus.tsx, TypingIndicator.tsx, VideoMessage.tsx, VoiceMessage.tsx}
|   |   |   |-- hooks/{useChat.ts, useMessages.ts, useTyping.ts}
|   |   |   |-- screens/{ChatListScreen.tsx, ChatScreen.tsx, MediaMessageScreen.tsx}
|   |   |   |-- services/{chatService.ts, messageService.ts}
|   |   |   `-- types/chat.types.ts
|   |   |-- discover/
|   |   |-- friends/
|   |   |   |-- components/{FriendItem.tsx, RequestItem.tsx, UserSearchItem.tsx}
|   |   |   |-- screens/{AddFriendsScreen.tsx, FriendRequestsScreen.tsx, FriendsScreen.tsx}
|   |   |   |-- services/friendService.ts
|   |   |   `-- types/friend.types.ts
|   |   |-- map/
|   |   |-- moderation/
|   |   |-- notifications/
|   |   |   |-- components/NotificationItem.tsx
|   |   |   |-- screens/NotificationsScreen.tsx
|   |   |   |-- services/notificationService.ts
|   |   |   `-- types/notification.types.ts
|   |   |-- profile/
|   |   |   |-- components/{Avatar.tsx, ProfileActions.tsx, ProfileHeader.tsx, Stats.tsx}
|   |   |   |-- screens/{EditProfileScreen.tsx, ProfileScreen.tsx, PublicProfileScreen.tsx}
|   |   |   |-- services/profileService.ts
|   |   |   `-- types/profile.types.ts
|   |   |-- search/
|   |   |-- settings/
|   |   |-- snaps/
|   |   `-- stories/
|   |       |-- components/{StoryAvatar.tsx, StoryProgress.tsx, StoryReactionBar.tsx, StoryReplyInput.tsx, StoryRing.tsx, StoryViewer.tsx}
|   |       |-- hooks/{useStories.ts, useStoryViewer.ts}
|   |       |-- screens/{CreateStoryScreen.tsx, StoriesScreen.tsx, StoryViewerScreen.tsx}
|   |       |-- services/storyService.ts
|   |       `-- types/story.types.ts
|   |-- hooks/{useDebounce.ts, useSocket.ts}
|   |-- lib/{logger.ts, permissions.ts, queryClient.ts}
|   |-- services/{analytics/, api/, auth/, media/, notifications/, socket/, storage/}
|   |-- store/{authStore.ts, cameraStore.ts, chatStore.ts, index.ts, storyStore.ts, userStore.ts}
|   |-- theme/{colors.ts, index.ts, radius.ts, shadows.ts, spacing.ts, typography.ts}
|   |-- types/{api.ts, common.ts, navigation.ts}
|   `-- utils/{date.ts, error.ts, format.ts, media.ts, validation.ts}
|-- .env
|-- .env.example
|-- .eslintrc.js
|-- .gitignore
|-- .prettierrc.js
|-- .watchmanconfig
|-- app.json
|-- App.tsx
|-- babel.config.js
|-- Gemfile
|-- index.js
|-- jest.config.js
|-- metro.config.js
|-- package.json
|-- package-lock.json
|-- PROJECT_TREE.md
|-- README.md
`-- tsconfig.json
```

## Additional Current Files

```text
src/features/
|-- auth/components/{AuthHeader.tsx, PasswordInput.tsx, OtpInput.tsx}
|-- calls/
|   |-- components/{CallButton.tsx, CallControls.tsx, IncomingCallModal.tsx, VideoPreview.tsx, CallTimer.tsx}
|   |-- hooks/{useCall.ts, useWebRTC.ts}
|   |-- screens/{AudioCallScreen.tsx, VideoCallScreen.tsx, IncomingCallScreen.tsx}
|   |-- services/callService.ts
|   `-- types/call.types.ts
|-- discover/
|   |-- components/{DiscoverCard.tsx, DiscoverHeader.tsx, DiscoverPost.tsx, CategoryChip.tsx}
|   |-- hooks/useDiscover.ts
|   |-- screens/DiscoverScreen.tsx
|   |-- services/discoverService.ts
|   `-- types/discover.types.ts
|-- map/
|   |-- components/{MapView.tsx, UserMarker.tsx, LocationCard.tsx}
|   |-- hooks/{useLocation.ts, useMap.ts}
|   |-- screens/{MapScreen.tsx, LocationDetailsScreen.tsx}
|   |-- services/locationService.ts
|   `-- types/map.types.ts
|-- moderation/
|   |-- components/{ReportModal.tsx, ReportReasonItem.tsx, BlockUserModal.tsx}
|   |-- screens/{ReportScreen.tsx, BlockedUsersScreen.tsx}
|   |-- services/moderationService.ts
|   `-- types/moderation.types.ts
|-- search/
|   |-- components/{SearchInput.tsx, SearchResultItem.tsx, SearchHistoryItem.tsx}
|   |-- hooks/useSearch.ts
|   |-- screens/SearchScreen.tsx
|   |-- services/searchService.ts
|   `-- types/search.types.ts
|-- settings/
|   |-- components/{SettingsItem.tsx, SettingsSection.tsx, ToggleSetting.tsx}
|   |-- screens/{SettingsScreen.tsx, PrivacySettingsScreen.tsx, NotificationSettingsScreen.tsx, SecuritySettingsScreen.tsx, AccountSettingsScreen.tsx}
|   |-- services/settingsService.ts
|   `-- types/settings.types.ts
|-- snaps/
|   |-- components/{SnapPreview.tsx, SnapRecipientItem.tsx, SnapTimer.tsx, SnapViewer.tsx, SnapActionBar.tsx}
|   |-- hooks/{useSnaps.ts, useSnapViewer.ts}
|   |-- screens/{SendSnapScreen.tsx, SnapInboxScreen.tsx, SnapViewerScreen.tsx}
|   |-- services/snapService.ts
|   `-- types/snap.types.ts
|-- camera/components/{CameraPermissionView.tsx, MediaToolbar.tsx, MusicPicker.tsx}
|-- camera/types/filter.types.ts
|-- chat/components/{ChatHeader.tsx, AttachmentMenu.tsx, RecordingButton.tsx, ReplyPreview.tsx}
|-- chat/types/message.types.ts
|-- stories/components/{StoryHeader.tsx, StoryMedia.tsx, StorySeenList.tsx}
`-- profile/components/{ProfileStats.tsx, ProfileBio.tsx, ProfileMenu.tsx}

src/services/
|-- api/{apiClient.ts, apiError.ts, apiTypes.ts}
|-- auth/authStorage.ts
|-- media/{mediaUploadService.ts, imageService.ts, videoService.ts}
|-- notifications/{pushNotificationService.ts, notificationPermissionService.ts}
|-- socket/{socketClient.ts, socketEvents.ts}
|-- storage/{secureStorage.ts, localStorage.ts}
`-- analytics/analyticsService.ts

src/constants/{routes.ts, socket.ts, media.ts}
src/types/{api.ts, common.ts, navigation.ts}

server/src/modules/
|-- auth/{auth.controller.ts, auth.service.ts, auth.repository.ts, auth.model.ts, auth.routes.ts, auth.types.ts, auth.validation.ts}
|-- friends/{friend.controller.ts, friend.service.ts, friend.repository.ts, friend.model.ts, friend.routes.ts, friend.types.ts, friend.validation.ts}
|-- stories/{story.controller.ts, story.service.ts, story.repository.ts, story.model.ts, story.routes.ts, story.types.ts, story.validation.ts}
|-- snaps/{snap.controller.ts, snap.service.ts, snap.repository.ts, snap.model.ts, snap.routes.ts, snap.types.ts, snap.validation.ts}
|-- chat/{chat.controller.ts, chat.service.ts, chat.repository.ts, chat.model.ts, chat.routes.ts, chat.types.ts, chat.validation.ts}
|-- messages/{message.controller.ts, message.service.ts, message.repository.ts, message.model.ts, message.routes.ts, message.types.ts, message.validation.ts}
|-- calls/{call.controller.ts, call.service.ts, call.repository.ts, call.model.ts, call.routes.ts, call.types.ts, call.validation.ts}
|-- notifications/{notification.controller.ts, notification.service.ts, notification.repository.ts, notification.model.ts, notification.routes.ts, notification.types.ts, notification.validation.ts}
|-- media/{media.controller.ts, media.service.ts, media.repository.ts, media.model.ts, media.routes.ts, media.types.ts, media.validation.ts}
|-- blocks/{block.controller.ts, block.service.ts, block.repository.ts, block.model.ts, block.routes.ts, block.types.ts, block.validation.ts}
|-- reports/{report.controller.ts, report.service.ts, report.repository.ts, report.model.ts, report.routes.ts, report.types.ts, report.validation.ts}
`-- discover/{discover.controller.ts, discover.service.ts, discover.repository.ts, discover.model.ts, discover.routes.ts, discover.types.ts, discover.validation.ts}

server/src/middlewares/{validationMiddleware.ts, notFoundMiddleware.ts, corsMiddleware.ts}
server/src/utils/{asyncHandler.ts, httpError.ts, date.ts, validation.ts}
server/src/jobs/{mediaCleanup.job.ts, sessionCleanup.job.ts}
server/src/sockets/{connection.socket.ts, socketEvents.ts}

shared/
|-- types/{user.ts, auth.ts, friend.ts, story.ts, snap.ts, chat.ts, message.ts, call.ts, notification.ts, media.ts}
|-- constants/{roles.ts, limits.ts, media.ts}
`-- schemas/{auth.schema.ts, user.schema.ts, story.schema.ts, snap.schema.ts, chat.schema.ts, message.schema.ts}

docs/{architecture.md, api.md, database.md, navigation.md, realtime.md, media.md, security.md, roadmap.md}
```
