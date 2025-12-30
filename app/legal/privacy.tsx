// Privacy Policy screen
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>Last updated: December 2024</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to JidouNavi. We respect your privacy and are committed to protecting your personal data.
          This privacy policy explains how we collect, use, and safeguard your information when you use our app.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We collect the following types of information:
        </Text>
        <Text style={styles.bulletPoint}>• Account information (email, username)</Text>
        <Text style={styles.bulletPoint}>• Location data (when you add or visit vending machines)</Text>
        <Text style={styles.bulletPoint}>• Photos you upload of vending machines</Text>
        <Text style={styles.bulletPoint}>• Usage data (visits, contributions, badges earned)</Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information to:
        </Text>
        <Text style={styles.bulletPoint}>• Provide and improve our services</Text>
        <Text style={styles.bulletPoint}>• Show nearby vending machines on the map</Text>
        <Text style={styles.bulletPoint}>• Track your contributions and award badges</Text>
        <Text style={styles.bulletPoint}>• Communicate with you about your account</Text>

        <Text style={styles.sectionTitle}>4. Location Data</Text>
        <Text style={styles.paragraph}>
          We collect location data only when you explicitly use location-based features (finding nearby machines,
          adding a new machine, or checking in). You can control location permissions through your device settings.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal data. Your contributions (machine locations, photos) are shared publicly
          to help other users discover vending machines. Your email and account details remain private.
        </Text>

        <Text style={styles.sectionTitle}>6. Data Security</Text>
        <Text style={styles.paragraph}>
          We use industry-standard security measures to protect your data, including encryption in transit
          and at rest. Your data is stored securely using Supabase infrastructure.
        </Text>

        <Text style={styles.sectionTitle}>7. Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to:
        </Text>
        <Text style={styles.bulletPoint}>• Access your personal data</Text>
        <Text style={styles.bulletPoint}>• Request correction of your data</Text>
        <Text style={styles.bulletPoint}>• Request deletion of your account</Text>
        <Text style={styles.bulletPoint}>• Withdraw consent for location tracking</Text>

        <Text style={styles.sectionTitle}>8. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this privacy policy or your data, please contact us at:
          support@jidounavi.app
        </Text>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: '#FF4B4B',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginLeft: 8,
    marginBottom: 4,
  },
  spacer: {
    height: 40,
  },
});
