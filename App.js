import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from './DashboardScreen'; // Importing the new DashboardScreen
import LoginScreen from './LoginScreen'; // Ensure you have LoginScreen implemented
import Payment from './Payment';
import { registerForPushNotificationsAsync } from './services/notifications';

useEffect(() => {
  registerForPushNotificationsAsync();
}, []);

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Payment" component={Payment} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
