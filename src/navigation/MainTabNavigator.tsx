import { adaptThemeColor, createAdaptiveStyles } from '../theme/systemTheme';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome5';
import type { PrimaryTabParamList } from '../types/navigation';
import ChatListScreen from '../features/chat/screens/ChatListScreen';
import DiscoverScreen from '../features/discover/screens/DiscoverScreen';
import CameraScreen from '../features/camera/screens/CameraScreen';
import MapScreen from '../features/map/screens/MapScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';

const Tab = createBottomTabNavigator<PrimaryTabParamList>();

const tabLabels: Record<keyof PrimaryTabParamList, string> = {
  Chats: 'Chat',
  Discover: 'Discover',
  Camera: 'Camera',
  Map: 'Map',
  Profile: 'Profile',
};

const tabIcons: Record<keyof PrimaryTabParamList, string> = {
  Chats: 'comment',
  Discover: 'search',
  Camera: 'camera',
  Map: 'map-marker-alt',
  Profile: 'user',
};

const isPrimaryTab = (name: string): name is keyof PrimaryTabParamList =>
  name in tabLabels;

const MainTabBar = ({ state, navigation }: BottomTabBarProps) => (
  <View style={styles.tabBar}>
    {state.routes.map((route, index) => {
      if (!isPrimaryTab(route.name)) {
        return null;
      }
      const isFocused = state.index === index;
      const routeName = route.name;

      const handlePress = () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(routeName);
        }
      };

      if (routeName === 'Camera') {
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={tabLabels[routeName]}
            accessibilityState={{ selected: isFocused }}
            onPress={handlePress}
            style={styles.cameraButton}
          >
            <Icon
              name={tabIcons[routeName]}
              size={27}
              color={adaptThemeColor('#080808', 'color')}
              solid
            />
          </Pressable>
        );
      }

      return (
        <Pressable
          key={route.key}
          accessibilityRole="button"
          accessibilityLabel={tabLabels[routeName]}
          accessibilityState={{ selected: isFocused }}
          onPress={handlePress}
          style={styles.tabItem}
        >
          <Icon
            name={tabIcons[routeName]}
            size={23}
            color={isFocused ? '#FFEA00' : adaptThemeColor('#999999', 'color')}
            solid={isFocused}
          />
          <Text
            style={[
              styles.tabLabel,
              isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            {tabLabels[routeName]}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const MainTabNavigator = () => {
  useColorScheme();
  return (
    <Tab.Navigator
      initialRouteName="Chats"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={MainTabBar}
    >
      <Tab.Screen name="Chats" component={ChatListScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Camera" component={CameraScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;

const styles = createAdaptiveStyles({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    height: 84,
    backgroundColor: '#0B0B0B',
    borderTopWidth: 0,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  tabItem: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#FFEA00',
  },
  tabLabelInactive: {
    color: '#999999',
  },
  cameraButton: {
    width: 62,
    height: 62,
    marginTop: -18,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEA00',
    borderWidth: 3,
    borderColor: '#161616',
  },
});
