import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Sentry } from './sentry';

/**
 * Get the Notifications module safely
 */
function getNotificationsModule() {
  try {
    return require('expo-notifications');
  } catch (e) {
    console.error('expo-notifications module not found');
    return null;
  }
}

/**
 * Get the Device module safely
 */
function getDeviceModule() {
  try {
    return require('expo-device');
  } catch (e) {
    console.error('expo-device module not found');
    return null;
  }
}

// Configure how notifications are handled when the app is foregrounded
const Notifications = getNotificationsModule();
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        // New properties to ensure visibility in foreground
        priority: Notifications.AndroidImportance.MAX,
      }),
    });
  } catch (e) {
    console.warn('Failed to set notification handler:', e);
  }
}

/**
 * Request permissions and register the push token in Supabase
 */
export async function registerForPushNotificationsAsync() {
  const Notifications = getNotificationsModule();
  const Device = getDeviceModule();

  if (!Notifications || !Device) {
    console.warn('Notification or Device modules are missing. Registration skipped.');
    return null;
  }

  try {
    let token;

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined,
      });
      token = tokenData.data;
    } else {
      return null;
    }

    // Platform-specific configuration for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF4B4B',
      });
    }

    // Store/Update token in Supabase
    const { error } = await supabase.rpc('upsert_push_token', {
      p_token: token,
      p_platform: Platform.OS,
      p_device_name: Device.deviceName || 'Simulator',
    });

    if (error) {
      console.error('Error storing push token:', error);
      Sentry.captureException(error, { tags: { context: 'push_token_registration' } });
    }

    return token;
  } catch (error) {
    console.error('Push notification registration failed:', error);
    return null;
  }
}

/**
 * Clear push token from Supabase (on logout)
 */
export async function unregisterPushNotificationsAsync() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,
    });
    const token = tokenData.data;

    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('token', token);

    if (error) {
      console.error('Error removing push token:', error);
    }
  } catch (error) {
    // Ignore errors on unregister
  }
}