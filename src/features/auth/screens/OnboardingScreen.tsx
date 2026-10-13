import { getSystemStatusBarStyle, adaptThemeClassName } from '../../../theme/systemTheme';
import React, { useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../types/navigation';
import Icon from 'react-native-vector-icons/Feather';

const Card1 = require('../../../assets/images/onboarding/onboarding-card-1.png');
const Card2 = require('../../../assets/images/onboarding/onboarding-card-2.png');
const Card3 = require('../../../assets/images/onboarding/onboarding-card-3.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

type OnboardingSlide = {
  id: string;
  image: ImageSourcePropType;
  title: string;
  description: string;
};

const accentTextStyle = {
  color: '#fee004',
};

const interRegular = Platform.select({
  android: 'inter-latin-400-normal',
  ios: 'Inter',
});

const interBold = Platform.select({
  android: 'inter-latin-700-normal',
  ios: 'Inter',
});

const slides: OnboardingSlide[] = [
  {
    id: '1',
    image: Card1,
    title: 'Capture\nReal Moments',
    description:
      'Share snaps, stories and stay connected with your friends.',
  },
  {
    id: '2',
    image: Card2,
    title: 'Edit & Express',
    description:
      'Add text, stickers, filters and make your snaps unique.',
  },
  {
    id: '3',
    image: Card3,
    title: 'Stay Connected',
    description:
      "Find your friends, see what they're up to and explore stories from around the world.",
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isLastSlide = currentIndex === slides.length - 1;

  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);

    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (isLastSlide) {
      navigation.replace('Welcome');
      return;
    }

    flatListRef.current?.scrollToIndex({
      index: currentIndex + 1,
      animated: true,
    });
  };

  const handleSkip = () => {
    navigation.replace('Welcome');
  };

  const renderTitle = (item: OnboardingSlide) => {
    if (item.id === '1') {
      return (
        <Text 
        style={{ fontFamily: interBold }}
        className={adaptThemeClassName('text-[34px] font-bold leading-[39px] text-white')}>
          Capture{'\n'}
          <Text style={accentTextStyle}>Real Moments</Text>
        </Text>
      );
    }

    if (item.id === '2') {
      return (
        <Text className={adaptThemeClassName('text-[34px] font-bold leading-[39px] text-white')}>
          Edit & <Text style={accentTextStyle}>Express</Text>
        </Text>
      );
    }

    return (
      <Text className={adaptThemeClassName('text-[34px] font-bold leading-[39px] text-white')}>
        Stay <Text style={accentTextStyle}>Connected</Text>
      </Text>
    );
  };

  const renderSlide = ({
    item,
    index,
  }: {
    item: OnboardingSlide;
    index: number;
  }) => {
    return (
      <View
        style={{ width: screenWidth }}
        className={adaptThemeClassName('flex-1 bg-black px-6')}
      >
        {/* Image Area */}
        <View className="flex-1 items-center justify-center pt-8">
          <Image
            source={item.image}
            resizeMode="contain"
            className="h-[390px] w-[270px] rounded-[28px]"
            style={{
              transform: [
                {
                  rotate:
                    index === 0
                      ? '-6deg'
                      : index === 1
                        ? '5deg'
                        : index === 2
                          ? '-4deg'
                          : '6deg',
                },
              ],
            }}
          />
        </View>

        {/* Content */}
        <View className="justify-end pb-8">
          {renderTitle(item)}

          <Text 
          style={{ fontFamily: interRegular }}
          className={adaptThemeClassName('mt-4 max-w-[330px] text-[14px] leading-[24px] text-zinc-400')}>
            {item.description}
          </Text>

          {/* Bottom Controls */}
          <View className="mt-8 flex-row items-center justify-between">
            {/* Pagination */}
            <View className="flex-row items-center">
              {slides.map((_, dotIndex) => {
                const active = currentIndex === dotIndex;

                return (
                  <View
                    key={dotIndex}
                    className={adaptThemeClassName(`mr-3 rounded-full ${
                      active
                        ? 'h-3 w-3 bg-[#fee004]'
                        : 'h-2.5 w-2.5 bg-zinc-600'
                    }`)}
                  />
                );
              })}
            </View>

            {/* Next Button */}
            <Pressable
              onPress={handleNext}
              accessibilityRole="button"
              accessibilityLabel={isLastSlide ? 'Finish onboarding' : 'Next slide'}
              className={adaptThemeClassName('h-[50px] w-[50px] items-center justify-center rounded-full bg-[#fee004] active:opacity-80')}
            >
              <Text className={adaptThemeClassName('text-[28px] font-semibold text-black')}>
                <Icon name="arrow-right" size={25} color="rgb(0, 0, 0)" />
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className={adaptThemeClassName('flex-1 bg-black')}>
      <StatusBar
        barStyle={getSystemStatusBarStyle()}
      />

      {/* Skip */}
      {!isLastSlide && (
        <Pressable
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          className="absolute right-6 top-14 z-50 px-2 py-2"
        >
          <Text className={adaptThemeClassName('text-[15px] font-medium text-zinc-400')}>
            Skip
          </Text>
        </Pressable>
      )}

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: true,
            listener: handleScroll,
          },
        )}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />
    </View>
  );
}
