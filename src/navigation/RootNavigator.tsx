import { adaptThemeColor, adaptThemeClassName } from '../theme/systemTheme';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { initializePushNotifications } from '../services/notifications/pushNotifications';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isAuthenticated, isRestoring, restoreSession, logout } = useAuth();
  useSocket(isAuthenticated);
  const [authStartRoute, setAuthStartRoute] = React.useState<
    'Splash' | 'Welcome'
  >('Splash');
  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: '#FFEA00',
          background: '#080808',
          card: '#111111',
          text: '#FFFFFF',
          border: '#292929',
          notification: '#FF3F83',
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: '#FFEA00',
          background: '#FFFFFF',
          card: '#FFFFFF',
          text: '#17191C',
          border: '#E5E8EA',
          notification: '#FF3F83',
        },
      };

  useEffect(() => {
    restoreSession().catch(error => {
      Alert.alert(
        'Session restore failed',
        error instanceof Error
          ? error.message
          : 'Unable to restore your session.',
      );
    });
  }, [restoreSession]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    let stopPushNotifications: () => void = () => {};
    initializePushNotifications()
      .then(stop => {
        if (active) stopPushNotifications = stop;
        else stop();
      })
      .catch(error => {
        console.error('Unable to initialize push notifications', {
          message: error instanceof Error ? error.message : 'Initialization failed',
        });
      });
    return () => {
      active = false;
      stopPushNotifications();
    };
  }, [isAuthenticated]);

  if (isRestoring) {
    return (
      <View
        className={adaptThemeClassName(
          'flex-1 items-center justify-center bg-[#080808]',
        )}
      >
        <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          initialRouteName={isAuthenticated ? 'Main' : 'Auth'}
          screenOptions={{ headerShown: false }}
        >
          {!isAuthenticated ? (
            <Stack.Screen name="Auth">
              {props => (
                <AuthNavigator
                  {...props}
                  initialRouteName={authStartRoute}
                  onAuthenticated={() => undefined}
                />
              )}
            </Stack.Screen>
          ) : null}
          {isAuthenticated ? (
            <Stack.Screen name="Main">
              {() => (
                <MainNavigator
                  onLogout={async () => {
                    setAuthStartRoute('Welcome');
                    try {
                      await logout();
                    } catch (error) {
                      Alert.alert(
                        'Signed out locally',
                        error instanceof Error
                          ? `The remote session could not be cleared: ${error.message}`
                          : 'The remote session could not be cleared.',
                      );
                    }
                  }}
                />
              )}
            </Stack.Screen>
          ) : null}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default RootNavigator;
