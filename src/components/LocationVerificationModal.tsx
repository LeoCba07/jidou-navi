// Modal to verify EXIF-extracted location before using it
import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Mapbox, { Camera, MapView, PointAnnotation } from '@rnmapbox/maps';

const { width } = Dimensions.get('window');

// Initialize Mapbox (token is set in the main map screen)
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '');

interface LocationVerificationModalProps {
  visible: boolean;
  latitude: number;
  longitude: number;
  onConfirm: () => void;
  onReject: () => void;
}

export function LocationVerificationModal({
  visible,
  latitude,
  longitude,
  onConfirm,
  onReject,
}: LocationVerificationModalProps) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  function handleClose(callback: () => void) {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
    });
  }

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Title */}
          <Text style={styles.title}>{t('addMachine.locationVerification.title')}</Text>

          {/* Map Preview */}
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              styleURL="mapbox://styles/mapbox/streets-v12"
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              attributionEnabled={false}
              logoEnabled={false}
            >
              <Camera
                centerCoordinate={[longitude, latitude]}
                zoomLevel={15}
                animationMode="none"
              />
              <PointAnnotation
                id="exif-location"
                coordinate={[longitude, latitude]}
              >
                <View style={styles.marker}>
                  <View style={styles.markerInner} />
                </View>
              </PointAnnotation>
            </MapView>
          </View>

          {/* Coordinates */}
          <Text style={styles.coordinates}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </Text>

          {/* Question */}
          <Text style={styles.question}>{t('addMachine.locationVerification.question')}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.rejectButton]}
              onPress={() => handleClose(onReject)}
            >
              <Text style={styles.rejectButtonText}>
                {t('addMachine.locationVerification.useCurrentLocation')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.confirmButton]}
              onPress={() => handleClose(onConfirm)}
            >
              <Text style={styles.confirmButtonText}>
                {t('addMachine.locationVerification.usePhotoLocation')}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 48,
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 20,
    borderWidth: 4,
    borderColor: '#3C91E6',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 10,
  },
  title: {
    fontSize: 16,
    fontFamily: 'DotGothic16',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  mapContainer: {
    height: 150,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4B4B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  coordinates: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  question: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 3,
  },
  confirmButton: {
    backgroundColor: '#FF4B4B',
    borderWidth: 3,
    borderColor: '#CC3C3C',
  },
  rejectButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowOpacity: 0.15,
  },
  confirmButtonText: {
    fontSize: 13,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
  rejectButtonText: {
    fontSize: 13,
    fontFamily: 'Silkscreen',
    color: '#666',
  },
});
