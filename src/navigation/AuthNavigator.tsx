import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types/navigation';
import SplashScreen from '../features/auth/screens/SplashScreen';
import OnboardingScreen from '../features/auth/screens/OnboardingScreen';
import WelcomeScreen from '../features/auth/screens/WelcomeScreen';
import LoginScreen from '../features/auth/screens/LoginScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen';
import VerifyOtpScreen from '../features/auth/screens/VerifyOtpScreen';
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

type AuthNavigatorProps = {
  onAuthenticated: () => void;
  initialRouteName?: 'Splash' | 'Welcome';
};

const AuthNavigator = ({
  onAuthenticated,
  initialRouteName = 'Splash',
}: AuthNavigatorProps) => (
  <Stack.Navigator
    initialRouteName={initialRouteName}
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login">
      {props => <LoginScreen {...props} onAuthenticated={onAuthenticated} />}
    </Stack.Screen>
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="VerifyOtp">
      {props => (
        <VerifyOtpScreen
          {...props}
          onAuthenticated={onAuthenticated}
          onPasswordOtpVerified={(email, otp) =>
            props.navigation.navigate('ResetPassword', { email, otp })
          }
        />
      )}
    </Stack.Screen>
    <Stack.Screen name="ResetPassword">
      {props => (
        <ResetPasswordScreen
          {...props}
          onPasswordReset={() => props.navigation.navigate('Login')}
        />
      )}
    </Stack.Screen>
  </Stack.Navigator>
);

export default AuthNavigator;
