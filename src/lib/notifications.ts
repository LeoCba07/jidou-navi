import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Sentry } from './sentry';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request permissions and register the push token in Supabase
 */
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  try {
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

    // Get the token from Expo
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Will use projectId from app.json/Constants
    });
    const token = tokenData.data;

    // Platform-specific configuration for Android
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
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
      p_device_name: Device.deviceName || 'Unknown Device',
    });

    if (error) {
      console.error('Error storing push token:', error);
      Sentry.captureException(error, { tags: { context: 'push_token_registration' } });
    }

    return token;
  } catch (error) {
    console.error('Push notification registration failed:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Clear push token from Supabase (on logout)
 */
export async function unregisterPushNotificationsAsync() {
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

/**
 * Handle incoming notification logic (e.g. navigation)
 */
export function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data;
  
  if (data?.url) {
    // Navigate if a URL is provided in the payload
    // Use linking or router to handle this
  }
}
