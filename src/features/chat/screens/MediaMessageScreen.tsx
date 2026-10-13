import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React from 'react';
import { Image, Pressable, StatusBar, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';

type Props = BottomTabScreenProps<MainTabParamList, 'MediaMessage'>;

const sharedChatMedia = require('../../../assets/images/onboarding/onboarding-card-2.png');
const featuredMedia = require('../../../assets/images/onboarding/onboarding-card-4.png');

const MediaMessageScreen = ({ navigation, route }: Props) => {
  const image = route.params?.imageUri
    ? { uri: route.params.imageUri }
    : route.params?.mediaId === 'shared-chat'
      ? sharedChatMedia
      : featuredMedia;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <Image source={image} resizeMode="contain" style={styles.media} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close media"
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Icon name="x" size={27} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
        {route.params?.userId && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${route.params.name ?? 'creator'}'s profile`}
            onPress={() =>
              navigation.navigate('PublicProfile', {
                userId: route.params?.userId,
                name: route.params?.name,
              })
            }
            style={styles.headerButton}
          >
            <Icon name="user" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
        )}
      </View>
      {route.params?.name && (
        <Text style={styles.caption}>{route.params.name}</Text>
      )}
    </View>
  );
};

export default MediaMessageScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#080808',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.56)',
  },
  caption: {
    position: 'absolute',
    bottom: 42,
    left: 22,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
