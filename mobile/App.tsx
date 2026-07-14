import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthScreen from './src/AuthScreen';
import MapScreen from './src/MapScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionData = await AsyncStorage.getItem('kiosk_account');
        if (sessionData) {
          setAccount(JSON.parse(sessionData));
        }
      } catch (e) {
        console.error('Failed to load session', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {account ? (
            <Stack.Screen name="Map">
              {(props) => (
                <MapScreen 
                  {...props} 
                  account={account} 
                  onLogout={async () => {
                    await AsyncStorage.removeItem('kiosk_account');
                    setAccount(null);
                  }} 
                />
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Auth">
              {(props) => (
                <AuthScreen 
                  {...props} 
                  onLogin={(u: any) => setAccount(u)} 
                />
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
