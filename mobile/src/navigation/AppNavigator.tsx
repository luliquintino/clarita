import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import CheckInScreen from '../screens/CheckInScreen';
import TimelineScreen from '../screens/TimelineScreen';
import InsightsScreen from '../screens/InsightsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MedicationScreen from '../screens/MedicationScreen';
import AssessmentScreen from '../screens/AssessmentScreen';

// ── Tab Icon Component ────────────────────────────────────────────────────────

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    'Início': '\u2302',
    'Check-in': '\u2661',
    'Linha do Tempo': '\u2630',
    'Insights': '\u2726',
    'Perfil': '\u2691',
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text
        style={[
          styles.tabIcon,
          { color: focused ? '#22c55e' : '#9ca3af' },
        ]}
      >
        {icons[label] || '\u25CF'}
      </Text>
    </View>
  );
}

// ── Stack Navigators ──────────────────────────────────────────────────────────

const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fefdfb' },
      }}
    >
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen
        name="Medications"
        component={MedicationScreen}
        options={{
          headerShown: true,
          headerTitle: 'Medicamentos',
          headerStyle: { backgroundColor: '#fefdfb' },
          headerTintColor: '#1f2937',
          headerShadowVisible: false,
        }}
      />
      <HomeStack.Screen
        name="Assessments"
        component={AssessmentScreen}
        options={{
          headerShown: true,
          headerTitle: 'Avaliações',
          headerStyle: { backgroundColor: '#fefdfb' },
          headerTintColor: '#1f2937',
          headerShadowVisible: false,
        }}
      />
    </HomeStack.Navigator>
  );
}

const InsightsStack = createNativeStackNavigator();

function InsightsStackNavigator() {
  return (
    <InsightsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fefdfb' },
      }}
    >
      <InsightsStack.Screen name="InsightsMain" component={InsightsScreen} />
    </InsightsStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator();

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fefdfb' },
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

// ── Tab Navigator ─────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 88,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen name="Início" component={HomeStackNavigator} />
      <Tab.Screen name="Check-in" component={CheckInScreen} />
      <Tab.Screen name="Linha do Tempo" component={TimelineScreen} />
      <Tab.Screen name="Insights" component={InsightsStackNavigator} />
      <Tab.Screen name="Perfil" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
});
