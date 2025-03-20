import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import MapScreen from '../screens/MapScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthScreen from '../screens/AuthScreen';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

const BottomTab = createBottomTabNavigator();

// Create a custom theme that forces initial route
const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'white',
  },
};

export default function Navigation() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={MyTheme}>
      <BottomTab.Navigator 
        initialRouteName="Map"
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: '#0066cc',
        }}
      >
        <BottomTab.Screen 
          name="Map" 
          component={MapScreen}
          options={{
            tabBarLabel: 'Map',
          }}
        />
        <BottomTab.Screen 
          name="Explore" 
          component={ExploreScreen}
          options={{
            tabBarLabel: 'Explore',
          }}
        />
        <BottomTab.Screen 
          name="Profile" 
          component={user ? ProfileScreen : AuthScreen}
          listeners={{
            tabPress: e => {
              // Don't do anything special on tab press
            },
          }}
          options={{
            tabBarLabel: user ? 'Profile' : 'Sign In',
          }}
        />
      </BottomTab.Navigator>
    </NavigationContainer>
  );
}