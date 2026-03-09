import React, { useState, useEffect, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { authService } from './src/services/auth';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

// ── Auth Context ──────────────────────────────────────────────────────────────

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  completeOnboarding: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ── Auth Stack ────────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fefdfb' },
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
    </AuthStack.Navigator>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      if (authenticated) {
        const userData = await authService.getUser();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    setIsAuthenticated(true);
    if (!response.user.onboardingCompleted) {
      setHasCompletedOnboarding(false);
    }
  };

  const register = async (data: any) => {
    const response = await authService.register(data);
    setUser(response.user);
    setIsAuthenticated(true);
    setHasCompletedOnboarding(false);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setHasCompletedOnboarding(true);
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, register, logout, completeOnboarding }}
    >
      <NavigationContainer>
        <StatusBar style="dark" />
        {isAuthenticated && hasCompletedOnboarding ? (
          <AppNavigator />
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fefdfb',
  },
});
