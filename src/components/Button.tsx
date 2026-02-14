import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, FONTS, SHADOWS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../theme/constants';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : COLORS.primary} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: SPACING.lg,
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    borderWidth: 3,
  },
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.pixelLarge,
  },
  secondary: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.backgroundDark,
    ...SHADOWS.soft,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: COLORS.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  text: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.button,
    letterSpacing: 1,
  },
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: COLORS.text,
  },
  outlineText: {
    color: COLORS.primary,
  },
});
