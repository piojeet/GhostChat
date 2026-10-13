import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  PanResponder,
  PermissionsAndroid,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Geolocation, {
  type GeolocationError,
  type GeolocationResponse,
} from '@react-native-community/geolocation';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { getSystemStatusBarStyle } from '../../../theme/systemTheme';
import { ApiError } from '../../../services/api/apiError';
import GenderAvatar from '../../profile/components/GenderAvatar';
import type { MainTabParamList } from '../../../types/navigation';
import {
  getFriendLocations,
  getLocationPreferences,
  updateLocationPreferences,
  updateMyLocation,
  type LocationPreferences,
  type SharedFriendLocation,
} from '../services/locationService';
import { LEAFLET_MAP_HTML } from '../leafletMapHtml';
import { parseMapBridgeMessage } from '../mapWebViewBridge';

type Props = BottomTabScreenProps<MainTabParamList, 'Map'>;
type MapType = 'standard' | 'dark';
let geolocationConfigured = false;

const formatUpdatedTime = (value: string): string => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Update time unavailable';
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return 'Updated just now';
  if (elapsedMinutes < 60) return `Updated ${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Updated ${elapsedHours}h ago`;
  return `Updated ${Math.floor(elapsedHours / 24)}d ago`;
};

const readableError = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

const requestForegroundLocationPermission = async (): Promise<void> => {
  if (!geolocationConfigured) {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: true,
      authorizationLevel: 'whenInUse',
      enableBackgroundLocationUpdates: false,
      locationProvider: 'auto',
    });
    geolocationConfigured = true;
  }

  if (Platform.OS === 'android') {
    const finePermission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    const coarsePermission = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
    const fineGranted = await PermissionsAndroid.check(finePermission);
    const coarseGranted = await PermissionsAndroid.check(coarsePermission);
    if (fineGranted || coarseGranted) return;

    const result = await PermissionsAndroid.requestMultiple([
      coarsePermission,
      finePermission,
    ]);
    if (
      result[coarsePermission] === PermissionsAndroid.RESULTS.GRANTED ||
      result[finePermission] === PermissionsAndroid.RESULTS.GRANTED
    ) {
      return;
    }
    throw new Error('Location permission was denied. Allow foreground location access in Settings to use this feature.');
  }

  await new Promise<void>((resolve, reject) => {
    Geolocation.requestAuthorization(
      resolve,
      (error: GeolocationError) => reject(new Error(error.message)),
    );
  });
};

const getCurrentPosition = (): Promise<GeolocationResponse> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      resolve,
      (error: GeolocationError) => reject(new Error(error.message)),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  });

const MapScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const webViewRef = useRef<WebView<{}> | null>(null);
  const mapReadyRef = useRef(false);
  const pendingFocusRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [friends, setFriends] = useState<SharedFriendLocation[]>([]);
  const [preferences, setPreferences] = useState<LocationPreferences | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<SharedFriendLocation | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [mapType, setMapType] = useState<MapType>('dark');
  const [expanded, setExpanded] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshingLocations, setRefreshingLocations] = useState(false);
  const [updatingPreference, setUpdatingPreference] = useState(false);
  const [error, setError] = useState('');
  const [preferenceError, setPreferenceError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [tileStatus, setTileStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [webViewError, setWebViewError] = useState('');
  const [mapKey, setMapKey] = useState(0);
  const sheetHeight = expanded
    ? Math.min(windowHeight * 0.58, 480)
    : selectedFriend
      ? 176
      : 132;

  const loadMapData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshingLocations(true);
    else setLoading(true);
    setError('');
    setPreferenceError('');
    const [locationsResult, preferencesResult] = await Promise.allSettled([
      getFriendLocations(),
      getLocationPreferences(),
    ]);
    if (locationsResult.status === 'fulfilled') {
      setFriends(locationsResult.value);
    } else {
      setFriends([]);
      setError(readableError(locationsResult.reason, 'Unable to load friends on the map.'));
    }
    if (preferencesResult.status === 'fulfilled') {
      setPreferences(preferencesResult.value);
    } else {
      setPreferences(null);
      setPreferenceError(
        readableError(preferencesResult.reason, 'Unable to load location privacy settings.'),
      );
    }
    setLoading(false);
    setRefreshingLocations(false);
  }, []);

  useFocusEffect(useCallback(() => {
    loadMapData();
  }, [loadMapData]));

  useEffect(() => {
    if (webViewError || (mapReady && tileStatus !== 'loading')) return undefined;
    const timer = setTimeout(() => {
      if (mapReady) setTileStatus('error');
      else {
        setWebViewError('OpenStreetMap could not start. Check your connection and retry.');
        setTileStatus('error');
      }
    }, 15_000);
    return () => clearTimeout(timer);
  }, [mapReady, mapKey, tileStatus, webViewError]);

  const visibleFriends = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^@/, '');
    if (!term) return friends;
    return friends.filter(friend =>
      friend.user.username.toLowerCase().includes(term) ||
      friend.user.displayName.toLowerCase().includes(term),
    );
  }, [friends, search]);

  const postMapMessage = useCallback((message: Record<string, unknown>) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  const sendMapData = useCallback(() => {
    postMapMessage({
      type: 'mapData',
      friends: visibleFriends.map(friend => ({
        userId: friend.user.id,
        username: friend.user.username,
        avatar: friend.user.avatar ?? null,
        latitude: friend.latitude,
        longitude: friend.longitude,
        isStale: friend.isStale,
      })),
      currentLocation,
      selectedId: selectedFriend?.user.id ?? null,
    });
  }, [currentLocation, postMapMessage, selectedFriend, visibleFriends]);

  useEffect(() => {
    if (mapReady) sendMapData();
  }, [mapReady, sendMapData]);

  useEffect(() => {
    if (mapReady) postMapMessage({ type: 'style', style: mapType });
  }, [mapReady, mapType, postMapMessage]);

  const onMapMessage = useCallback((event: WebViewMessageEvent) => {
    const message = parseMapBridgeMessage(event.nativeEvent.data);
    if (!message) return;

    if (message.type === 'ready') {
      mapReadyRef.current = true;
      setMapReady(true);
      setWebViewError('');
      sendMapData();
      postMapMessage({ type: 'style', style: mapType });
      if (pendingFocusRef.current) {
        postMapMessage({ type: 'focus', ...pendingFocusRef.current });
        pendingFocusRef.current = null;
      }
      return;
    }
    if (message.type === 'tileStatus') {
      setTileStatus(message.status);
      return;
    }

    const friend = friends.find(item => item.user.id === message.userId);
    if (friend) {
      setSelectedFriend(friend);
      setExpanded(true);
    }
  }, [friends, mapType, postMapMessage, sendMapData]);

  const focusLocation = useCallback((latitude: number, longitude: number) => {
    if (!mapReadyRef.current) {
      pendingFocusRef.current = { latitude, longitude };
      return;
    }
    postMapMessage({ type: 'focus', latitude, longitude });
  }, [postMapMessage]);

  const fetchLocation = useCallback(async () => {
    await requestForegroundLocationPermission();
    const position = await getCurrentPosition();
    const coordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    setCurrentLocation(coordinates);
    return coordinates;
  }, []);

  const recenterOnMe = useCallback(async () => {
    setLocationMessage('');
    try {
      const coordinates = await fetchLocation();
      focusLocation(coordinates.latitude, coordinates.longitude);
      if (preferences?.sharingEnabled && !preferences.ghostMode) {
        await updateMyLocation(coordinates.latitude, coordinates.longitude);
        setPreferences(current => current
          ? { ...current, lastUpdatedAt: new Date().toISOString() }
          : current);
      }
    } catch (failure) {
      const message = failure instanceof Error
        ? failure.message
        : 'Could not access your location.';
      setLocationMessage(message);
      if (/denied|permission/i.test(message)) {
        Alert.alert('Location permission needed', message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
      }
    }
  }, [fetchLocation, focusLocation, preferences]);

  const toggleSharing = useCallback(async (enabled: boolean) => {
    if (!preferences || updatingPreference) return;
    if (enabled && preferences.ghostMode) {
      setLocationMessage('Turn off Ghost Mode before enabling location sharing.');
      return;
    }
    setUpdatingPreference(true);
    setLocationMessage('');
    try {
      const coordinates = enabled ? await fetchLocation() : null;
      const updated = await updateLocationPreferences(enabled, preferences.ghostMode);
      setPreferences(updated);
      if (coordinates) {
        await updateMyLocation(coordinates.latitude, coordinates.longitude);
        setPreferences(current => current
          ? { ...current, lastUpdatedAt: new Date().toISOString() }
          : current);
        setCurrentLocation(coordinates);
        focusLocation(coordinates.latitude, coordinates.longitude);
      }
      await loadMapData(true);
    } catch (failure) {
      setLocationMessage(
        failure instanceof Error
          ? failure.message
          : 'Unable to update location sharing. Please try again.',
      );
    } finally {
      setUpdatingPreference(false);
    }
  }, [fetchLocation, focusLocation, loadMapData, preferences, updatingPreference]);

  const toggleGhostMode = useCallback(async (enabled: boolean) => {
    if (!preferences || updatingPreference) return;
    setUpdatingPreference(true);
    setLocationMessage('');
    try {
      const updated = await updateLocationPreferences(
        enabled ? false : preferences.sharingEnabled,
        enabled,
      );
      setPreferences(updated);
      if (!enabled && updated.sharingEnabled) {
        const coordinates = await fetchLocation();
        await updateMyLocation(coordinates.latitude, coordinates.longitude);
        setCurrentLocation(coordinates);
        setPreferences(current => current
          ? { ...current, lastUpdatedAt: new Date().toISOString() }
          : current);
      }
      await loadMapData(true);
    } catch (failure) {
      setLocationMessage(
        failure instanceof Error
          ? failure.message
          : 'Unable to update Ghost Mode. Please try again.',
      );
    } finally {
      setUpdatingPreference(false);
    }
  }, [fetchLocation, loadMapData, preferences, updatingPreference]);

  const openFriend = useCallback((friend: SharedFriendLocation) => {
    navigation.navigate('PublicProfile', {
      userId: friend.user.id,
      username: friend.user.username,
      name: friend.user.displayName,
    });
  }, [navigation]);

  const startChat = useCallback((friend: SharedFriendLocation) => {
    navigation.navigate('Chat', {
      userId: friend.user.id,
      name: friend.user.displayName,
    });
  }, [navigation]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy < -28) setExpanded(true);
        if (gesture.dy > 28) setExpanded(false);
      },
    }),
    [],
  );

  const renderFriendRow = ({ item }: { item: SharedFriendLocation }) => (
    <View style={styles.friendRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Focus map on @${item.user.username}`}
        onPress={() => {
          setSelectedFriend(item);
          setExpanded(true);
          focusLocation(item.latitude, item.longitude);
        }}
        style={styles.friendMain}
      >
        <View style={styles.friendAvatar}>
          <GenderAvatar avatar={item.user.avatar} gender={item.user.gender} size={44} />
          {item.isStale ? <View style={styles.staleDot} /> : null}
        </View>
        <View style={styles.friendCopy}>
          <Text numberOfLines={1} style={styles.friendName}>@{item.user.username}</Text>
          <Text numberOfLines={1} style={styles.friendUpdated}>
            {item.isStale ? 'Stale · ' : ''}{formatUpdatedTime(item.lastUpdatedAt)}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open @${item.user.username}'s profile`}
        onPress={() => openFriend(item)}
        style={styles.rowAction}
      >
        <Icon name="user" size={17} color="#E7E8EA" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Message @${item.user.username}`}
        onPress={() => startChat(item)}
        style={styles.rowAction}
      >
        <Icon name="message-circle" size={17} color="#FFEA00" />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <WebView<{}>
        key={mapKey}
        ref={webViewRef}
        style={styles.map}
        source={{ html: LEAFLET_MAP_HTML, baseUrl: 'https://ghostchat.local/' }}
        originWhitelist={['https://ghostchat.local']}
        userAgent="GhostChat/1.0"
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccessFromFileURLs={false}
        mixedContentMode="never"
        scrollEnabled={false}
        onMessage={onMapMessage}
        onError={() => {
          mapReadyRef.current = false;
          setWebViewError('The map could not be loaded. Check your connection and retry.');
          setTileStatus('error');
        }}
        onHttpError={() => {
          mapReadyRef.current = false;
          setWebViewError('The map could not be loaded. Check your connection and retry.');
          setTileStatus('error');
        }}
        onShouldStartLoadWithRequest={request =>
          request.url === 'about:blank' || request.url.startsWith('https://ghostchat.local/')
        }
      />

      {!mapReady || tileStatus === 'loading' || webViewError || tileStatus === 'error' ? (
        <View style={[styles.mapLoadNotice, { top: insets.top + 76 }]}>
          {webViewError || tileStatus === 'error' ? (
            <>
              <Text style={styles.mapLoadText}>
                {webViewError || 'OpenStreetMap tiles could not be loaded. Check your internet connection.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setWebViewError('');
                  setTileStatus('loading');
                  if (webViewError || !mapReady) {
                    mapReadyRef.current = false;
                    setMapReady(false);
                    setMapKey(value => value + 1);
                  } else {
                    postMapMessage({ type: 'retry' });
                  }
                }}
                style={styles.mapRetryButton}
              >
                <Text style={styles.mapRetryText}>Retry</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator size="small" color="#FFEA00" />
              <Text style={styles.mapLoadText}>Loading OpenStreetMap…</Text>
            </>
          )}
        </View>
      ) : null}

      <View style={[styles.topControls, { top: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          onPress={() => navigation.navigate('Profile')}
          style={styles.topCircle}
        >
          <Icon name="user" size={20} color="#FFFFFF" />
        </Pressable>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color="#A6A8AD" />
          <TextInput
            accessibilityLabel="Search places and friends"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearch}
            placeholder="Search places and friends"
            placeholderTextColor="#92949A"
            returnKeyType="search"
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => setSearch('')}>
              <Icon name="x-circle" size={17} color="#A6A8AD" />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Location sharing settings"
          onPress={() => setSettingsVisible(true)}
          style={styles.topCircle}
        >
          <Icon name="settings" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={[styles.mapActions, { top: insets.top + 78 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change map style, currently ${mapType}`}
          onPress={() => setMapType(current => current === 'dark' ? 'standard' : 'dark')}
          style={styles.actionButton}
        >
          <Icon name="layers" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <Text
        accessibilityLabel="Map data © OpenStreetMap contributors"
        pointerEvents="none"
        style={[styles.mapAttribution, { bottom: sheetHeight + insets.bottom + 7 }]}
      >
        © OpenStreetMap contributors
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Center map on my location"
        onPress={recenterOnMe}
        style={[
          styles.recenterButton,
          { bottom: sheetHeight + insets.bottom + 20 },
        ]}
      >
        <Icon name="crosshair" size={22} color="#151515" />
      </Pressable>

      {locationMessage ? (
        <View style={[styles.inlineMessage, { bottom: sheetHeight + insets.bottom + 78 }]}>
          <Text style={styles.inlineMessageText}>{locationMessage}</Text>
        </View>
      ) : null}

      <View
        style={[
          styles.bottomSheet,
          {
            height: sheetHeight,
            bottom: Math.max(insets.bottom, 6),
          },
        ]}
      >
        <View {...panResponder.panHandlers}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Collapse friends on map' : 'Expand friends on map'}
            onPress={() => setExpanded(value => !value)}
            style={styles.sheetHandleArea}
          >
            <View style={styles.sheetHandle} />
          </Pressable>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Friends on Map</Text>
              <Text style={styles.sheetSubtitle}>
                {loading
                  ? 'Finding friends who shared their location…'
                  : `${friends.length} ${friends.length === 1 ? 'friend' : 'friends'} sharing`}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh friends on map"
              disabled={refreshingLocations}
              onPress={() => loadMapData(true)}
              style={styles.refreshButton}
            >
              {refreshingLocations
                ? <ActivityIndicator size="small" color="#FFEA00" />
                : <Icon name="refresh-cw" size={17} color="#FFEA00" />}
            </Pressable>
          </View>
        </View>

        {error ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => loadMapData(true)}
            style={styles.errorCard}
          >
            <Icon name="wifi-off" size={17} color="#FF9A9A" />
            <Text style={styles.errorText}>{error} · Tap to retry</Text>
          </Pressable>
        ) : null}
        {preferenceError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => loadMapData(true)}
            style={styles.errorCard}
          >
            <Text style={styles.errorText}>{preferenceError} · Tap to retry</Text>
          </Pressable>
        ) : null}

        {selectedFriend && (
          <View style={styles.selectedPreview}>
            <GenderAvatar
              avatar={selectedFriend.user.avatar}
              gender={selectedFriend.user.gender}
              size={42}
            />
            <View style={styles.selectedCopy}>
              <Text style={styles.selectedName}>@{selectedFriend.user.username}</Text>
              <Text style={styles.selectedUpdated}>
                {selectedFriend.isStale ? 'Stale · ' : ''}
                {formatUpdatedTime(selectedFriend.lastUpdatedAt)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View friend's profile"
              onPress={() => openFriend(selectedFriend)}
              style={styles.rowAction}
            >
              <Icon name="user" size={18} color="#E7E8EA" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start chat with friend"
              onPress={() => startChat(selectedFriend)}
              style={styles.rowAction}
            >
              <Icon name="message-circle" size={18} color="#FFEA00" />
            </Pressable>
          </View>
        )}

        {expanded ? (
          loading && friends.length === 0 && !error ? (
            <ActivityIndicator color="#FFEA00" style={styles.listLoading} />
          ) : friends.length === 0 && !error ? (
            <View style={styles.emptyState}>
              <Icon name="map-pin" size={23} color="#FFEA00" />
              <Text style={styles.emptyTitle}>
                {search.trim() ? 'No shared friends matched' : 'No friends sharing right now'}
              </Text>
              <Text style={styles.emptyCopy}>
                {search.trim()
                  ? 'Place search needs a configured Places provider.'
                  : 'Friends appear here only when they choose to share their location.'}
              </Text>
            </View>
          ) : error ? null : (
            <FlatList
              data={visibleFriends}
              keyExtractor={item => item.user.id}
              renderItem={renderFriendRow}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.friendList}
              ListEmptyComponent={
                <Text style={styles.emptyCopy}>No shared locations match your search.</Text>
              }
            />
          )
        ) : null}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
        transparent
        visible={settingsVisible}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close location settings"
          onPress={() => setSettingsVisible(false)}
          style={styles.modalBackdrop}
        >
          <Pressable onPress={event => event.stopPropagation()} style={styles.settingsCard}>
            <View style={styles.settingsHeader}>
              <View>
                <Text style={styles.settingsTitle}>Location Privacy</Text>
                <Text style={styles.settingsSubtitle}>You control when friends can see you</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setSettingsVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="x" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {preferences ? (
              <>
                <View style={styles.preferenceRow}>
                  <View style={styles.preferenceIcon}>
                    <Icon name="map-pin" size={19} color="#FFEA00" />
                  </View>
                  <View style={styles.preferenceCopy}>
                    <Text style={styles.preferenceTitle}>Share my location</Text>
                    <Text style={styles.preferenceSubtitle}>
                      Only accepted friends can see an approximate location.
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Share my location"
                    disabled={updatingPreference || preferences.ghostMode}
                    onValueChange={toggleSharing}
                    thumbColor="#FFFFFF"
                    trackColor={{ false: '#41444A', true: '#FFEA00' }}
                    value={preferences.sharingEnabled && !preferences.ghostMode}
                  />
                </View>
                <View style={styles.preferenceRow}>
                  <View style={styles.preferenceIcon}>
                    <Icon name="eye-off" size={19} color="#FFEA00" />
                  </View>
                  <View style={styles.preferenceCopy}>
                    <Text style={styles.preferenceTitle}>Ghost Mode</Text>
                    <Text style={styles.preferenceSubtitle}>
                      Hide and remove your shared location from friends.
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Ghost Mode"
                    disabled={updatingPreference}
                    onValueChange={toggleGhostMode}
                    thumbColor="#FFFFFF"
                    trackColor={{ false: '#41444A', true: '#FFEA00' }}
                    value={preferences.ghostMode}
                  />
                </View>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => loadMapData(true)}
                style={styles.errorCard}
              >
                <Text style={styles.errorText}>
                  {preferenceError || 'Location privacy settings are not available.'} · Tap to retry
                </Text>
              </Pressable>
            )}
            {updatingPreference ? (
              <ActivityIndicator color="#FFEA00" style={styles.preferenceLoading} />
            ) : null}
            {locationMessage ? (
              <Text style={styles.preferenceError}>{locationMessage}</Text>
            ) : null}
            <Text style={styles.retentionNote}>
              Location updates are manual, foreground-only, rounded for friends, and expire after 12 hours.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#111820',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  topControls: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  topCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    backgroundColor: 'rgba(14,16,19,0.94)',
    elevation: 7,
  },
  searchBar: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    backgroundColor: 'rgba(14,16,19,0.96)',
    elevation: 7,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: '#FFFFFF',
    fontSize: 12,
  },
  mapActions: {
    position: 'absolute',
    right: 14,
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    backgroundColor: 'rgba(14,16,19,0.94)',
    elevation: 6,
  },
  recenterButton: {
    position: 'absolute',
    right: 15,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#FFEA00',
    elevation: 8,
  },
  mapLoadNotice: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#3A3C40',
    borderRadius: 14,
    backgroundColor: 'rgba(20,20,22,0.96)',
  },
  mapLoadText: {
    flex: 1,
    color: '#E4E4E6',
    fontSize: 11,
  },
  mapRetryButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFEA00',
  },
  mapRetryText: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '800',
  },
  mapAttribution: {
    position: 'absolute',
    left: 12,
    paddingHorizontal: 7,
    paddingVertical: 4,
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: 'rgba(12,13,15,0.82)',
    color: '#F0F0F0',
    fontSize: 9,
  },
  inlineMessage: {
    position: 'absolute',
    left: 16,
    right: 76,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#514821',
    borderRadius: 12,
    backgroundColor: 'rgba(18,18,15,0.96)',
  },
  inlineMessageText: {
    color: '#E8E0B6',
    fontSize: 11,
    lineHeight: 16,
  },
  bottomSheet: {
    position: 'absolute',
    left: 8,
    right: 8,
    overflow: 'hidden',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#292B2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: 'rgba(12,13,15,0.98)',
    elevation: 14,
  },
  sheetHandleArea: {
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#62646A',
  },
  sheetHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    paddingBottom: 8,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  sheetSubtitle: {
    marginTop: 3,
    color: '#92949A',
    fontSize: 11,
  },
  refreshButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#202125',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    marginBottom: 7,
    borderRadius: 10,
    backgroundColor: '#2B191A',
  },
  errorText: {
    flex: 1,
    color: '#FFB0B0',
    fontSize: 11,
    lineHeight: 16,
  },
  selectedPreview: {
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 3,
    borderTopWidth: 1,
    borderTopColor: '#292B2E',
  },
  selectedCopy: {
    flex: 1,
  },
  selectedName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  selectedUpdated: {
    marginTop: 3,
    color: '#9EA0A5',
    fontSize: 10,
  },
  friendList: {
    paddingBottom: 12,
  },
  friendRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: '#232529',
  },
  friendMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
  },
  friendAvatar: {
    position: 'relative',
  },
  staleDot: {
    position: 'absolute',
    right: -1,
    bottom: 1,
    width: 11,
    height: 11,
    borderWidth: 2,
    borderColor: '#101113',
    borderRadius: 6,
    backgroundColor: '#8D929A',
  },
  friendCopy: {
    flex: 1,
  },
  friendName: {
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '700',
  },
  friendUpdated: {
    marginTop: 4,
    color: '#92949A',
    fontSize: 10,
  },
  rowAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#202125',
  },
  listLoading: {
    marginTop: 30,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  emptyTitle: {
    marginTop: 8,
    color: '#F2F2F3',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyCopy: {
    marginTop: 5,
    color: '#96989D',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  settingsCard: {
    width: '100%',
    paddingHorizontal: 17,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#303236',
    borderRadius: 22,
    backgroundColor: '#111214',
    elevation: 18,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  settingsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  settingsSubtitle: {
    marginTop: 4,
    color: '#92949A',
    fontSize: 11,
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#26282C',
  },
  preferenceRow: {
    minHeight: 75,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#26282C',
  },
  preferenceIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#282615',
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceTitle: {
    color: '#F5F5F6',
    fontSize: 13,
    fontWeight: '700',
  },
  preferenceSubtitle: {
    marginTop: 3,
    color: '#999BA0',
    fontSize: 10,
    lineHeight: 14,
  },
  preferenceLoading: {
    marginVertical: 8,
  },
  preferenceError: {
    marginTop: 8,
    color: '#FFAAAA',
    fontSize: 11,
    lineHeight: 16,
  },
  retentionNote: {
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#26282C',
    color: '#84868B',
    fontSize: 10,
    lineHeight: 15,
  },
});
