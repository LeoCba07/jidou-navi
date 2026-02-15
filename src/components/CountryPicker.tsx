// Country picker modal component
import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { countries, Country } from '../lib/countries';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZES, ICON_SIZES } from '../theme/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.6;

interface CountryPickerProps {
  visible: boolean;
  selectedCountry: string | null;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export default function CountryPicker({
  visible,
  selectedCountry,
  onSelect,
  onClose,
}: CountryPickerProps) {
  const { t } = useTranslation();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.9);
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

  function handleClose() {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }

  function handleSelect(country: Country) {
    onSelect(country);
    handleClose();
  }

  const renderCountryItem = ({ item: country }: { item: Country }) => {
    const isSelected = selectedCountry === country.code;
    return (
      <Pressable
        style={[styles.countryItem, isSelected && styles.countryItemSelected]}
        onPress={() => handleSelect(country)}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        <View style={styles.countryInfo}>
          <Text style={styles.countryFlag}>{country.flag}</Text>
          <Text style={[styles.countryName, isSelected && styles.countryNameSelected]}>
            {country.name}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={ICON_SIZES.md} color={COLORS.primary} />
        )}
      </Pressable>
    );
  };

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.title}>{t('auth.selectCountry')}</Text>

          <FlatList
            data={countries}
            keyExtractor={(item) => item.code}
            renderItem={renderCountryItem}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
            initialNumToRender={15}
            maxToRenderPerBatch={20}
          />

          <Pressable style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
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
    padding: SPACING.xl,
  },
  container: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 360,
    height: MODAL_HEIGHT,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.pixel,
    padding: SPACING.lg,
    borderWidth: 4,
    borderColor: COLORS.primary,
    ...SHADOWS.pixelLarge,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.title,
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    marginBottom: SPACING.md,
  },
  listContent: {
    gap: SPACING.sm,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.pixel,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
  },
  countryItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5F5',
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  countryFlag: {
    fontSize: FONT_SIZES.xxl,
  },
  countryName: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  countryNameSelected: {
    color: COLORS.primary,
    fontFamily: FONTS.bodySemiBold,
  },
  cancelButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundDark,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  cancelText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.button,
    color: COLORS.textMuted,
  },
});
