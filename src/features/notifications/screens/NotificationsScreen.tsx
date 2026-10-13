import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../../types/navigation';
import { getSnap } from '../../snaps/services/snapService';
import NotificationItem from '../components/NotificationItem';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationCategory, NotificationEntry } from '../types/notification.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Notifications'>;
type Filter = 'All' | 'Snaps' | 'Stories' | 'Chats' | 'System';

const filters: Filter[] = ['All', 'Snaps', 'Stories', 'Chats', 'System'];
const categoryForFilter: Record<Filter, NotificationCategory> = {
  All: 'all',
  Snaps: 'snaps',
  Stories: 'stories',
  Chats: 'chats',
  System: 'system',
};

const NotificationsScreen = ({ navigation }: Props) => {
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    refreshing,
    error,
    refresh,
    loadMore,
    markAsRead,
    isAuthenticated,
    isRestoring,
  } = useNotifications(categoryForFilter[activeFilter]);

  const changeFilter = (filter: Filter) => {
    if (filter === activeFilter) return;
    setActiveFilter(filter);
  };

  const openNotification = async (item: NotificationEntry) => {
    if (item.unread) await markAsRead(item.id);

    switch (item.type) {
      case 'SNAP_RECEIVED':
        if (item.entityType === 'snap' && item.entityId && item.userId) {
          navigation.navigate('SnapViewer', {
            snapId: item.entityId,
            userId: item.userId,
            name: item.name,
          });
        } else {
          Alert.alert('Snap unavailable', 'This Snap notification no longer links to a Snap.');
        }
        break;
      case 'SNAP_REPLY':
        if (item.userId) {
          navigation.navigate('Chat', { userId: item.userId, name: item.name });
        }
        break;
      case 'MESSAGE_RECEIVED':
        if (item.userId) {
          navigation.navigate('Chat', { userId: item.userId, name: item.name });
        }
        break;
      case 'FRIEND_REQUEST':
        navigation.navigate('FriendRequests');
        break;
      case 'STORY_MENTION':
      case 'STORY_LIKED':
        if (item.entityType === 'story' && item.entityId) {
          navigation.navigate('StoryViewer', {
            storyId: item.entityId,
            source: 'Stories',
          });
        } else {
          Alert.alert('Story unavailable', 'This Story notification no longer links to a Story.');
        }
        break;
      case 'USER_FOLLOWED': {
        const userId = item.entityType === 'user' ? item.entityId : item.userId;
        if (userId) {
          navigation.navigate('PublicProfile', { userId, name: item.name });
        }
        break;
      }
      case 'SYSTEM':
        if (item.entityType === 'story' && item.entityId) {
          navigation.navigate('StoryViewer', {
            storyId: item.entityId,
            source: 'Stories',
          });
        } else if (item.entityType === 'snap' && item.entityId) {
          try {
            const snap = await getSnap(item.entityId);
            navigation.navigate('SnapViewer', {
              snapId: item.entityId,
              userId: snap.sender.id,
              name: snap.sender.displayName,
            });
          } catch {
            Alert.alert('Snap unavailable', 'This Snap notification no longer links to a Snap.');
          }
        } else if (item.entityType === 'user' && item.entityId) {
          navigation.navigate('PublicProfile', {
            userId: item.entityId,
            name: item.name,
          });
        } else {
          Alert.alert(item.name, item.message);
        }
        break;
    }
  };

  const emptyContent = () => {
    if (loading || isRestoring) {
      return <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} style={styles.stateIndicator} />;
    }
    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={refresh}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    if (!isAuthenticated) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Sign in to view notifications</Text>
        </View>
      );
    }
    const emptyMessage: Record<Filter, string> = {
      All: 'No notifications yet',
      Snaps: 'No Snap notifications',
      Stories: 'No Story notifications',
      Chats: 'No chat notifications',
      System: 'No system notifications',
    };
    return (
      <View style={styles.emptyState}>
        <Icon name="bell" size={36} color={adaptThemeColor('#FFEA00', 'color')} />
        <Text style={styles.emptyTitle}>All caught up</Text>
        <Text style={styles.emptyText}>{emptyMessage[activeFilter]}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
        <Image
          source={require('../../../assets/images/splash/snapapp-ghost.png')}
          style={styles.ghost}
        />
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.bellWrap}>
          <Icon name="bell" size={27} color={adaptThemeColor('#FFFFFF', 'color')} />
          {unreadCount > 0 && <View style={styles.headerDot} />}
        </View>
      </View>

      <View style={styles.filterBar}>
        {filters.map((filter, index) => {
          const isActive = activeFilter === filter;
          return (
            <React.Fragment key={filter}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                onPress={() => changeFilter(filter)}
                style={[styles.filterTab, isActive && styles.activeFilterTab]}
              >
                <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                  {filter}
                </Text>
              </Pressable>
              {index < filters.length - 1 && <View style={styles.filterDivider} />}
            </React.Fragment>
          );
        })}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={openNotification} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={adaptThemeColor('#FFEA00', 'color')}
          />
        }
        ListEmptyComponent={emptyContent()}
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} style={styles.stateIndicator} />
            : undefined
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        initialNumToRender={10}
        windowSize={7}
      />
    </SafeAreaView>
  );
};

export default NotificationsScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  header: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  ghost: {
    width: 43,
    height: 43,
    marginRight: 15,
    borderRadius: 9,
  },
  backButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  bellWrap: {
    position: 'relative',
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDot: {
    position: 'absolute',
    top: 3,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFEA00',
  },
  filterBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#303238',
    borderRadius: 30,
    backgroundColor: '#111216',
  },
  filterTab: {
    height: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
  activeFilterTab: {
    backgroundColor: '#FFFFFF',
  },
  filterText: {
    color: '#C6C8CD',
    fontSize: 15,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#111111',
    fontWeight: '800',
  },
  filterDivider: {
    width: 1,
    height: 23,
    backgroundColor: '#33353B',
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 2,
    paddingBottom: 24,
  },
  stateIndicator: {
    marginTop: 74,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 74,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 5,
    color: '#A8AFBC',
    fontSize: 14,
    textAlign: 'center',
  },
  retryText: {
    marginTop: 12,
    color: '#FFEA00',
    fontSize: 14,
    fontWeight: '700',
  },
});
