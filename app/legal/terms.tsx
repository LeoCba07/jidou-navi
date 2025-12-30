// Terms of Service screen
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function TermsOfServiceScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>Last updated: December 2024</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By using JidouNavi, you agree to these Terms of Service. If you do not agree to these terms,
          please do not use the app.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          JidouNavi is a crowdsourced platform for discovering and sharing vending machine locations.
          Users can add new machines, check in at locations, earn badges, and explore nearby machines.
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          You must create an account to use most features. You are responsible for:
        </Text>
        <Text style={styles.bulletPoint}>• Maintaining the security of your account</Text>
        <Text style={styles.bulletPoint}>• All activities that occur under your account</Text>
        <Text style={styles.bulletPoint}>• Providing accurate information</Text>

        <Text style={styles.sectionTitle}>4. User Content</Text>
        <Text style={styles.paragraph}>
          When you submit content (photos, locations, descriptions), you:
        </Text>
        <Text style={styles.bulletPoint}>• Grant us a license to use and display this content</Text>
        <Text style={styles.bulletPoint}>• Confirm you have the right to share this content</Text>
        <Text style={styles.bulletPoint}>• Agree not to submit inappropriate or illegal content</Text>

        <Text style={styles.sectionTitle}>5. Acceptable Use</Text>
        <Text style={styles.paragraph}>
          You agree not to:
        </Text>
        <Text style={styles.bulletPoint}>• Submit false or misleading information</Text>
        <Text style={styles.bulletPoint}>• Harass other users or engage in harmful behavior</Text>
        <Text style={styles.bulletPoint}>• Attempt to manipulate the badge or leaderboard system</Text>
        <Text style={styles.bulletPoint}>• Use the app for any illegal purpose</Text>
        <Text style={styles.bulletPoint}>• Interfere with the proper functioning of the app</Text>

        <Text style={styles.sectionTitle}>6. Location Accuracy</Text>
        <Text style={styles.paragraph}>
          Vending machine locations are user-contributed and may not always be accurate. We do not guarantee
          the accuracy of any location data. Machines may be removed, relocated, or out of service.
        </Text>

        <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          The JidouNavi app, including its design, features, and branding, is owned by us. User-submitted
          content remains the property of users but is licensed to us for display within the app.
        </Text>

        <Text style={styles.sectionTitle}>8. Termination</Text>
        <Text style={styles.paragraph}>
          We may suspend or terminate your account if you violate these terms. You may delete your account
          at any time through the app settings.
        </Text>

        <Text style={styles.sectionTitle}>9. Disclaimer of Warranties</Text>
        <Text style={styles.paragraph}>
          The app is provided "as is" without warranties of any kind. We do not guarantee uninterrupted
          service or that the app will be error-free.
        </Text>

        <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
          consequential damages arising from your use of the app.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may update these terms from time to time. Continued use of the app after changes constitutes
          acceptance of the new terms.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact</Text>
        <Text style={styles.paragraph}>
          For questions about these terms, contact us at: support@jidounavi.app
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
