// Privacy Policy screen
import LegalPageLayout, {
  LastUpdated,
  SectionTitle,
  Paragraph,
  BulletPoint,
} from '../../src/components/LegalPageLayout';

export default function PrivacyPolicyScreen() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <LastUpdated date="December 2024" />

      <SectionTitle>1. Introduction</SectionTitle>
      <Paragraph>
        Welcome to JidouNavi. We respect your privacy and are committed to protecting your personal data.
        This privacy policy explains how we collect, use, and safeguard your information when you use our app.
      </Paragraph>

      <SectionTitle>2. Information We Collect</SectionTitle>
      <Paragraph>We collect the following types of information:</Paragraph>
      <BulletPoint>Account information (email, username)</BulletPoint>
      <BulletPoint>Location data (when you add or visit vending machines)</BulletPoint>
      <BulletPoint>Photos you upload of vending machines</BulletPoint>
      <BulletPoint>Usage data (visits, contributions, badges earned)</BulletPoint>

      <SectionTitle>3. How We Use Your Information</SectionTitle>
      <Paragraph>We use your information to:</Paragraph>
      <BulletPoint>Provide and improve our services</BulletPoint>
      <BulletPoint>Show nearby vending machines on the map</BulletPoint>
      <BulletPoint>Track your contributions and award badges</BulletPoint>
      <BulletPoint>Communicate with you about your account</BulletPoint>

      <SectionTitle>4. Location Data</SectionTitle>
      <Paragraph>
        We collect location data only when you explicitly use location-based features (finding nearby machines,
        adding a new machine, or checking in). You can control location permissions through your device settings.
      </Paragraph>

      <SectionTitle>5. Data Sharing</SectionTitle>
      <Paragraph>
        We do not sell your personal data. Your contributions (machine locations, photos) are shared publicly
        to help other users discover vending machines. Your email and account details remain private.
      </Paragraph>

      <SectionTitle>6. Data Security</SectionTitle>
      <Paragraph>
        We use industry-standard security measures to protect your data, including encryption in transit
        and at rest. Your data is stored securely using Supabase infrastructure.
      </Paragraph>

      <SectionTitle>7. Your Rights</SectionTitle>
      <Paragraph>You have the right to:</Paragraph>
      <BulletPoint>Access your personal data</BulletPoint>
      <BulletPoint>Request correction of your data</BulletPoint>
      <BulletPoint>Request deletion of your account</BulletPoint>
      <BulletPoint>Withdraw consent for location tracking</BulletPoint>

      <SectionTitle>8. Contact Us</SectionTitle>
      <Paragraph>
        If you have questions about this privacy policy or your data, please contact us at:
        support@jidounavi.app
      </Paragraph>
    </LegalPageLayout>
  );
}
