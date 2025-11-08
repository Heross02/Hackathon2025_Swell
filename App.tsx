import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, Image } from 'react-native';

// Your screens
import TMTherapyScreen from './src/screens/TMTherapyScreen';
import CheckIn from './src/screens/CheckIn';

export type TabParamList = {
  Home: undefined;
  TMTherapy: undefined;
  CheckIn: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const NavigationOptions = {
  tabBarActiveTintColor: '#f4511e',
  tabBarInactiveTintColor: '#888',
  headerStyle: { backgroundColor: '#f4511e' },
  headerTintColor: '#fff',
  headerLeft: () => (
    <Image
      source={require('./assets/logos/swell_logo.png')}
      style={{ width: 40, height: 40, marginLeft: 10 }}
      resizeMode="contain"
    />
  )
};

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={NavigationOptions}>
        <Tab.Screen 
          name="TMTherapy" 
          component={TMTherapyScreen} 
          options={{ title: 'Voice Therapy' }}
        />
        <Tab.Screen 
          name="CheckIn" 
          component={CheckIn} 
          options={{ title: 'Check-In' }}
        />
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
