// Terms of Service screen
import LegalPageLayout, {
  LastUpdated,
  SectionTitle,
  Paragraph,
  BulletPoint,
} from '../../src/components/LegalPageLayout';

export default function TermsOfServiceScreen() {
  return (
    <LegalPageLayout title="Terms of Service">
      <LastUpdated date="December 2024" />

      <SectionTitle>1. Acceptance of Terms</SectionTitle>
      <Paragraph>
        By using JidouNavi, you agree to these Terms of Service. If you do not agree to these terms,
        please do not use the app.
      </Paragraph>

      <SectionTitle>2. Description of Service</SectionTitle>
      <Paragraph>
        JidouNavi is a crowdsourced platform for discovering and sharing vending machine locations.
        Users can add new machines, check in at locations, earn badges, and explore nearby machines.
      </Paragraph>

      <SectionTitle>3. User Accounts</SectionTitle>
      <Paragraph>You must create an account to use most features. You are responsible for:</Paragraph>
      <BulletPoint>Maintaining the security of your account</BulletPoint>
      <BulletPoint>All activities that occur under your account</BulletPoint>
      <BulletPoint>Providing accurate information</BulletPoint>

      <SectionTitle>4. User Content</SectionTitle>
      <Paragraph>When you submit content (photos, locations, descriptions), you:</Paragraph>
      <BulletPoint>Grant us a license to use and display this content</BulletPoint>
      <BulletPoint>Confirm you have the right to share this content</BulletPoint>
      <BulletPoint>Agree not to submit inappropriate or illegal content</BulletPoint>

      <SectionTitle>5. Acceptable Use</SectionTitle>
      <Paragraph>You agree not to:</Paragraph>
      <BulletPoint>Submit false or misleading information</BulletPoint>
      <BulletPoint>Harass other users or engage in harmful behavior</BulletPoint>
      <BulletPoint>Attempt to manipulate the badge or leaderboard system</BulletPoint>
      <BulletPoint>Use the app for any illegal purpose</BulletPoint>
      <BulletPoint>Interfere with the proper functioning of the app</BulletPoint>

      <SectionTitle>6. Location Accuracy</SectionTitle>
      <Paragraph>
        Vending machine locations are user-contributed and may not always be accurate. We do not guarantee
        the accuracy of any location data. Machines may be removed, relocated, or out of service.
      </Paragraph>

      <SectionTitle>7. Intellectual Property</SectionTitle>
      <Paragraph>
        The JidouNavi app, including its design, features, and branding, is owned by us. User-submitted
        content remains the property of users but is licensed to us for display within the app.
      </Paragraph>

      <SectionTitle>8. Termination</SectionTitle>
      <Paragraph>
        We may suspend or terminate your account if you violate these terms. You may delete your account
        at any time through the app settings.
      </Paragraph>

      <SectionTitle>9. Disclaimer of Warranties</SectionTitle>
      <Paragraph>
        The app is provided "as is" without warranties of any kind. We do not guarantee uninterrupted
        service or that the app will be error-free.
      </Paragraph>

      <SectionTitle>10. Limitation of Liability</SectionTitle>
      <Paragraph>
        To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
        consequential damages arising from your use of the app.
      </Paragraph>

      <SectionTitle>11. Changes to Terms</SectionTitle>
      <Paragraph>
        We may update these terms from time to time. Continued use of the app after changes constitutes
        acceptance of the new terms.
      </Paragraph>

      <SectionTitle>12. Contact</SectionTitle>
      <Paragraph>
        For questions about these terms, contact us at: support@jidounavi.app
      </Paragraph>
    </LegalPageLayout>
  );
}
