import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types/navigation';
import MainTabNavigator from './MainTabNavigator';
import FriendsScreen from '../features/friends/screens/FriendsScreen';
import AddFriendsScreen from '../features/friends/screens/AddFriendsScreen';
import FriendRequestsScreen from '../features/friends/screens/FriendRequestsScreen';
import SearchScreen from '../features/search/screens/SearchScreen';
import MediaPreviewScreen from '../features/camera/screens/MediaPreviewScreen';
import CameraPreviewScreen from '../features/camera/screens/CameraPreviewScreen';
import EditSnapScreen from '../features/camera/screens/EditSnapScreen';
import SendSnapScreen from '../features/snaps/screens/SendSnapScreen';
import StoriesScreen from '../features/stories/screens/StoriesScreen';
import CreateStoryScreen from '../features/stories/screens/CreateStoryScreen';
import StoryViewerScreen from '../features/stories/screens/StoryViewerScreen';
import SnapViewerScreen from '../features/stories/screens/SnapViewerScreen';
import ChatScreen from '../features/chat/screens/ChatScreen';
import MediaMessageScreen from '../features/chat/screens/MediaMessageScreen';
import IncomingAudioCallScreen from '../features/calls/screens/IncomingAudioCallScreen';
import AudioCallScreen from '../features/calls/screens/AudioCallScreen';
import VideoCallScreen from '../features/calls/screens/VideoCallScreen';
import LocationDetailsScreen from '../features/map/screens/LocationDetailsScreen';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import EditProfileScreen from '../features/profile/screens/EditProfileScreen';
import PublicProfileScreen from '../features/profile/screens/PublicProfileScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen';
import VerifyOtpScreen from '../features/auth/screens/VerifyOtpScreen';
import AccountSettingsScreen from '../features/settings/screens/AccountSettingsScreen';
import NotificationSettingsScreen from '../features/settings/screens/NotificationSettingsScreen';
import PrivacySettingsScreen from '../features/settings/screens/PrivacySettingsScreen';
import SecuritySettingsScreen from '../features/settings/screens/SecuritySettingsScreen';
import ReportScreen from '../features/moderation/screens/ReportScreen';
import BlockedUsersScreen from '../features/moderation/screens/BlockedUsersScreen';
import { getSocketClient } from '../services/socket/socketClient';
import type { CallResponse } from '../features/calls/types/call.types';

const Stack = createNativeStackNavigator<MainStackParamList>();

const MainTabsWithCallEvents = ({
  navigation,
}: NativeStackScreenProps<MainStackParamList, 'MainTabs'>) => {
  useEffect(() => {
    const socket = getSocketClient();
    const onIncoming = (call: CallResponse) => {
      if (navigation.getState().routes.some(route => route.name === 'IncomingAudioCall')) return;
      navigation.navigate('IncomingAudioCall', {
        callId: call.id,
        kind: call.kind,
        userId: call.caller.id,
        name: call.caller.displayName,
        avatar: call.caller.avatar,
      });
    };
    socket.on('call:incoming', onIncoming);
    return () => {
      socket.off('call:incoming', onIncoming);
    };
  }, [navigation]);

  return <MainTabNavigator />;
};

type MainNavigatorProps = {
  onLogout: () => void | Promise<void>;
};

const MainNavigator = ({ onLogout }: MainNavigatorProps) => (
  <Stack.Navigator
    initialRouteName="MainTabs"
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name="MainTabs" component={MainTabsWithCallEvents} />
    <Stack.Screen name="Friends" component={FriendsScreen} />
    <Stack.Screen name="AddFriends" component={AddFriendsScreen} />
    <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} />
    <Stack.Screen name="Search" component={SearchScreen} />
    <Stack.Screen name="MediaPreview" component={MediaPreviewScreen} />
    <Stack.Screen name="CameraPreview" component={CameraPreviewScreen} />
    <Stack.Screen name="EditSnap" component={EditSnapScreen} />
    <Stack.Screen name="SendSnap" component={SendSnapScreen} />
    <Stack.Screen name="Stories" component={StoriesScreen} />
    <Stack.Screen name="CreateStory" component={CreateStoryScreen} />
    <Stack.Screen name="StoryViewer" component={StoryViewerScreen} />
    <Stack.Screen name="SnapViewer" component={SnapViewerScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="MediaMessage" component={MediaMessageScreen} />
    <Stack.Screen name="IncomingAudioCall" component={IncomingAudioCallScreen} />
    <Stack.Screen name="AudioCall" component={AudioCallScreen} />
    <Stack.Screen name="VideoCall" component={VideoCallScreen} />
    <Stack.Screen name="LocationDetails" component={LocationDetailsScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
    <Stack.Screen name="Settings">
      {props => <SettingsScreen {...props} onLogout={onLogout} />}
    </Stack.Screen>
    <Stack.Screen name="ResetPassword">
      {props => (
        <ResetPasswordScreen
          {...props}
          onPasswordReset={onLogout}
        />
      )}
    </Stack.Screen>
    <Stack.Screen name="VerifyOtp">
      {props => (
        <VerifyOtpScreen
          {...props}
          onPasswordOtpVerified={(email, otp) =>
            props.navigation.navigate('ResetPassword', { email, otp })
          }
        />
      )}
    </Stack.Screen>
    <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
    <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
    <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
    <Stack.Screen name="Report" component={ReportScreen} />
    <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
  </Stack.Navigator>
);

export default MainNavigator;
