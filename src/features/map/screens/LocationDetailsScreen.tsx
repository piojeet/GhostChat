import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';

type Props = BottomTabScreenProps<MainTabParamList, 'LocationDetails'>;

const LocationDetailsScreen = ({ navigation }: Props) => {
  const { height } = useWindowDimensions();
  const [isFavorite, setIsFavorite] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const heroHeight = Math.min(Math.max(height * 0.37, 230), 340);

  const showLocationOptions = () => {
    Alert.alert('Central Park', 'Location actions are sample interactions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share',
        onPress: () =>
          Alert.alert('Share location', 'Sharing will be available when connected.'),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          <ScenicArtwork scene={photoIndex} />
          <View style={styles.heroShade} />
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={[styles.heroButton, styles.backButton]}
          >
            <Icon name="arrow-left" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
          <Pressable
            accessibilityLabel="Location options"
            accessibilityRole="button"
            onPress={showLocationOptions}
            style={[styles.heroButton, styles.optionsButton]}
          >
            <Icon name="more-vertical" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
          <View style={styles.photoCount}>
            <Icon name="image" size={16} color={adaptThemeColor('#FFFFFF', 'color')} />
            <Text style={styles.photoCountText}>{photoIndex + 1} / 12</Text>
          </View>
          <View style={styles.photoDots}>
            {[0, 1, 2, 3, 4].map(index => (
              <Pressable
                key={index}
                accessibilityLabel={`Show location photo ${index + 1}`}
                accessibilityRole="button"
                onPress={() => setPhotoIndex(index)}
                style={[
                  styles.photoDot,
                  photoIndex === index && styles.photoDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleDetails}>
            <Text style={styles.locationName}>Central Park</Text>
            <View style={styles.addressRow}>
              <Icon name="map-pin" size={19} color={adaptThemeColor('#FFEA00', 'color')} />
              <Text style={styles.address}>New York, USA</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityRole="button"
            accessibilityState={{ selected: isFavorite }}
            onPress={() => setIsFavorite(current => !current)}
            style={styles.favoriteButton}
          >
            <Icon
              name="heart"
              size={27}
              color={isFavorite ? '#FFEA00' : '#FFFFFF'}
            />
          </Pressable>
        </View>

        <View style={styles.statsCard}>
          <Stat icon="camera" value="2.4K" label="Snaps" tint="#A8E8D5" />
          <View style={styles.statDivider} />
          <Stat icon="users" value="1.1K" label="Visitors" tint="#8FD8F4" />
          <View style={styles.statDivider} />
          <Stat icon="file-text" value="846" label="Posts" tint="#E2B8F1" />
        </View>

        <Pressable
          accessibilityLabel="Open Central Park map preview"
          accessibilityRole="button"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Map' })}
          style={styles.mapPreview}
        >
          <MapPreviewArtwork />
          <Pressable
            accessibilityLabel="Center on Central Park"
            accessibilityRole="button"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Map' })}
            style={styles.mapCenterButton}
          >
            <Icon name="crosshair" size={23} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
          <Text style={[styles.mapLabel, styles.manhattanLabel]}>Manhattan</Text>
          <Text style={[styles.mapLabel, styles.centralParkLabel]}>Central Park</Text>
          <Text style={[styles.mapLabel, styles.upperEastLabel]}>Upper{'\n'}East Side</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityLabel="View Central Park on map"
          accessibilityRole="button"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Map' })}
          style={styles.mapButton}
        >
          <Icon name="map-pin" size={27} color={adaptThemeColor('#080808', 'color')} />
          <Text style={styles.mapButtonText}>View on Map</Text>
          <Icon name="chevron-right" size={25} color={adaptThemeColor('#080808', 'color')} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const Stat = ({
  icon,
  value,
  label,
  tint,
}: {
  icon: string;
  value: string;
  label: string;
  tint: string;
}) => (
  <View style={styles.stat}>
    <View style={[styles.statIconWrap, { backgroundColor: `${tint}1A` }]}>
      <Icon name={icon} size={22} color={tint} />
    </View>
    <View style={styles.statTextWrap}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const ScenicArtwork = ({ scene }: { scene: number }) => {
  const lakeColors = ['#17616C', '#1C6775', '#155864', '#1B6470', '#13545F'];
  const lakeColor = lakeColors[scene] ?? lakeColors[0];

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <LinearGradient id="locationSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6CA9E8" />
          <Stop offset="0.68" stopColor="#DDEAF4" />
          <Stop offset="1" stopColor="#EFF0DD" />
        </LinearGradient>
        <LinearGradient id="locationLake" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={lakeColor} />
          <Stop offset="1" stopColor="#0B3443" />
        </LinearGradient>
      </Defs>
      <Rect width="400" height="300" fill="url(#locationSky)" />
      <Circle cx="65" cy="44" r="20" fill="#FFF7D6" opacity="0.72" />
      <Path
        d="M-12 70c12-13 28-12 38-2 10-16 33-12 37 4 18-7 34 5 31 19H-5zM274 49c12-12 29-10 37 2 10-11 28-8 31 5 17-5 31 5 29 17h-97z"
        fill="#FFFFFF"
        opacity="0.78"
      />
      <Path d="M0 174 55 103l29 35 67-92 54 75 41-53 85 105z" fill="#5C83AA" />
      <Path d="m123 112 28-66 28 39-18-9-10 18-12-12zM225 112l21-44 23 31-16-10-9 13-8-8z" fill="#EDF3F4" />
      <Path d="m0 178 71-83 40 49 51-70 54 83 54-67 51 63 45-48 48 64v60H0z" fill="#315C80" />
      <Path d="m49 122 22-27 18 23-15-7-8 11-7-7zM147 91l15-17 17 27-12-8-8 8-5-9zM254 108l16-18 19 24-16-9-9 10z" fill="#EAF1F4" />
      <Path d="M0 174c54-25 99-24 145-6 51 20 99 14 145-8 39-18 75-14 110-2v62H0z" fill="#183F35" />
      <Path d="M0 199c70-17 107-8 161 4 69 16 139-14 239-6v103H0z" fill="url(#locationLake)" />
      <Path d="M0 221c71-10 121 5 172 10 85 8 146-13 228-10" fill="none" stroke="#B8D6C3" strokeWidth="2" opacity="0.7" />
      <Path d="M31 239c48-7 82 4 117 7M234 246c43-8 84-10 134-8M82 266c46-4 76 4 109 3M266 272c31-5 62-6 98-3" fill="none" stroke="#8FC4C1" strokeWidth="2" opacity="0.5" />
      <Path d="M0 203c28-22 50-23 81-12 21 7 36 6 55-4l-24 42-112 16zM400 198c-34-25-54-18-80-8l-22 44 102 20z" fill="#223B2D" />
      <Path d="M15 195v-46m0 0-15 27h12l-12 18h30l-12-18h12zM40 189v-59m0 0-18 29h14l-13 20h34l-14-20h14zM366 186v-56m0 0-18 30h14l-13 19h34l-14-19h14zM390 197v-45m0 0-14 23h11l-10 17h27l-11-17h11z" fill="#10271F" />
      <Path d="M15 195v-46m25 40v-59m326 56v-56m24 66v-45" fill="none" stroke="#45664B" strokeWidth="2" />
    </Svg>
  );
};

const MapPreviewArtwork = () => (
  <Svg
    width="100%"
    height="100%"
    viewBox="0 0 400 150"
    preserveAspectRatio="xMidYMid slice"
    style={StyleSheet.absoluteFill}
  >
    <Rect width="400" height="150" fill="#101920" />
    <Path d="M170 5 243 0l45 31 9 82-50 37-82-7-36-54z" fill="#0C4329" />
    <Path
      d="M-15 24 102 68 180 151M12 153 120 93 204-8M80-10 158 72l78 90M230-20 186 65l-42 98M300-10 260 63l-32 104M380-15 320 59l-35 100M-20 116 102 83l105-28 115-25 105-29M-12 42l117 29 106 26 108 24 99 20"
      fill="none"
      stroke="#33434A"
      strokeWidth="7"
    />
    <Path
      d="M-15 24 102 68 180 151M12 153 120 93 204-8M80-10 158 72l78 90M230-20 186 65l-42 98M300-10 260 63l-32 104M380-15 320 59l-35 100M-20 116 102 83l105-28 115-25 105-29M-12 42l117 29 106 26 108 24 99 20"
      fill="none"
      stroke="#19272D"
      strokeWidth="3"
    />
    <Path d="M197 51c-9-12-27-5-24 9 2 9 19 23 24 27 6-6 22-20 24-29 2-13-15-19-24-7z" fill="#F34335" />
    <Circle cx="197" cy="63" r="5" fill="#FFFFFF" />
    <Circle cx="278" cy="95" r="14" fill="#FFEA00" opacity="0.22" />
    <Path d="M278 79c-8 0-14 6-14 14 0 11 14 24 14 24s14-13 14-24c0-8-6-14-14-14zm0 19a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" fill="#FFEA00" />
    <SvgText x="168" y="137" fill="#CED4D8" fontSize="10" fontWeight="600">Central Park</SvgText>
  </Svg>
);

export default LocationDetailsScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080A0B',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  hero: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#315C80',
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  heroButton: {
    position: 'absolute',
    top: 12,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: 'rgba(12, 20, 29, 0.76)',
  },
  backButton: {
    left: 12,
  },
  optionsButton: {
    right: 12,
  },
  photoCount: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(12, 17, 19, 0.76)',
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  photoDots: {
    position: 'absolute',
    right: 15,
    bottom: 19,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  photoDotActive: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17,
    paddingHorizontal: 6,
  },
  titleDetails: {
    flex: 1,
  },
  locationName: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 3,
  },
  address: {
    color: '#A3AAB4',
    fontSize: 17,
  },
  favoriteButton: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#34383C',
    borderRadius: 29,
  },
  statsCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#202326',
    borderRadius: 20,
    backgroundColor: '#0E1012',
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  statTextWrap: {
    alignItems: 'flex-start',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    color: '#A0A7B0',
    fontSize: 13,
  },
  statDivider: {
    width: 1,
    height: 51,
    backgroundColor: '#292C30',
  },
  mapPreview: {
    height: 154,
    overflow: 'hidden',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4A5559',
    borderRadius: 17,
    backgroundColor: '#101920',
  },
  mapCenterButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(4, 8, 11, 0.88)',
  },
  mapLabel: {
    position: 'absolute',
    color: '#AEB9C1',
    fontSize: 11,
    textShadowColor: '#000000',
    textShadowRadius: 4,
  },
  manhattanLabel: {
    left: 12,
    bottom: 35,
  },
  centralParkLabel: {
    left: '34%',
    bottom: 13,
    fontWeight: '700',
  },
  upperEastLabel: {
    right: 10,
    bottom: 37,
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 7,
    backgroundColor: '#080A0B',
  },
  mapButton: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    paddingHorizontal: 18,
    borderRadius: 23,
    backgroundColor: '#FFEA00',
  },
  mapButtonText: {
    flex: 1,
    color: '#080808',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
});
