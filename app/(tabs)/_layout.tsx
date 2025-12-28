// Bottom tabs: Map (index.tsx) and Profile (profile.tsx)
// FAB for adding machines - TODO: wire up in Issue #8
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Pressable, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Map',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      <Pressable style={styles.fab} onPress={() => console.log('Add machine')}>
        <Ionicons name="add" size={32} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 55,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF4B4B',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
