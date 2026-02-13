// Bottom tabs: Map (index.tsx), Discover (discover.tsx), and Profile (profile.tsx)
import { Tabs } from 'expo-router';
import { Image } from 'react-native';
import { useTranslation } from 'react-i18next';

const TAB_ICONS = {
  map: require('../../assets/pixel-tab-map.png'),
  discover: require('../../assets/pixel-tab-discover.png'),
  profile: require('../../assets/pixel-tab-profile.png'),
};

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ focused, size }) => (
            <Image
              source={TAB_ICONS.map}
              style={{
                width: size,
                height: size,
                opacity: focused ? 1 : 0.4,
                transform: [{ scale: focused ? 1.15 : 1 }],
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: ({ focused, size }) => (
            <Image
              source={TAB_ICONS.discover}
              style={{
                width: size,
                height: size,
                opacity: focused ? 1 : 0.4,
                transform: [{ scale: focused ? 1.15 : 1 }],
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused, size }) => (
            <Image
              source={TAB_ICONS.profile}
              style={{
                width: size,
                height: size,
                opacity: focused ? 1 : 0.4,
                transform: [{ scale: focused ? 1.15 : 1 }],
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
