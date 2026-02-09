import { View, Text, Image, StyleSheet } from 'react-native';

type Props = {
  size?: 'small' | 'default';
};

export default function VisitedStamp({ size = 'default' }: Props) {
  const isSmall = size === 'small';

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <View style={[styles.stamp, isSmall && styles.stampSmall]}>
        <Image
          source={require('../../../assets/icon.png')}
          style={[styles.icon, isSmall && styles.iconSmall]}
        />
        <Text style={[styles.text, isSmall && styles.textSmall]}>VISITED</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 4,
    zIndex: 10,
  },
  containerSmall: {
    top: 6,
    left: 2,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 75, 75, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 2,
    gap: 5,
    borderWidth: 2,
    borderColor: '#fff',
    borderStyle: 'dashed',
    transform: [{ rotate: '-15deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 5,
  },
  stampSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
    borderWidth: 1.5,
  },
  icon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  iconSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Silkscreen',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  textSmall: {
    fontSize: 8,
  },
});
