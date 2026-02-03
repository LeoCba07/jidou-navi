// Privacy Policy screen
import { useTranslation } from 'react-i18next';
import LegalPageLayout, {
  LastUpdated,
  SectionTitle,
  Paragraph,
  BulletPoint,
} from '../../src/components/LegalPageLayout';

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();

  return (
    <LegalPageLayout title={t('legal.privacy.title')}>
      <LastUpdated date={t('legal.updateDate')} />

      <SectionTitle>{t('legal.privacy.section1Title')}</SectionTitle>
      <Paragraph>{t('legal.privacy.section1Text')}</Paragraph>

      <SectionTitle>{t('legal.privacy.section2Title')}</SectionTitle>
      <Paragraph>{t('legal.privacy.section2Intro')}</Paragraph>
      <BulletPoint>{t('legal.privacy.section2Bullet1')}</BulletPoint>
      <BulletPoint>{t('legal.privacy.section2Bullet2')}</BulletPoint>
      <BulletPoint>{t('legal.privacy.section2Bullet3')}</BulletPoint>
      <BulletPoint>{t('legal.privacy.section2Bullet4')}</BulletPoint>
      <BulletPoint>{t('legal.privacy.section2Bullet5')}</BulletPoint>

      <SectionTitle>{t('legal.privacy.section3Title')}</SectionTitle>
      <Paragraph>{t('legal.privacy.section3Intro')}</Paragraph>
      <BulletPoint>{t('legal.privacy.section3Bullet1')}</BulletPoint>
      <BulletPoint>{t('legal.privacy.section3Bullet2')}</BulletPoint>
      <BulletPoint>{t('legal.privacy.section3Bullet3')}</BulletPoint>
      <BulletPoint>{t('legal.privacy.section3Bullet4')}</BulletPoint>
      <BulletPoint>{t('legal.privacy.section3Bullet5')}</BulletPoint>

      <SectionTitle>{t('legal.privacy.section4Title')}</SectionTitle>
      <Paragraph>{t('legal.privacy.section4Text')}</Paragraph>

      <SectionTitle>{t('legal.privacy.section5Title')}</SectionTitle>
      <Paragraph>{t('legal.privacy.section5Text')}</Paragraph>

      <SectionTitle>{t('legal.privacy.section6Title')}</SectionTitle>
      <Paragraph>{t('legal.privacy.section6Text')}</Paragraph>

      <SectionTitle>{t('legal.privacy.section7Title')}</SectionTitle>
      <Paragraph>{t('legal.privacy.section7Intro')}</Paragraph>
      <BulletPoint>{t('legal.privacy.section7Bullet1')}</BulletPoint>
      <BulletPoint>{t('legal.privacy.section7Bullet2')}</BulletPoint>
      <BulletPoint>{t('legal.privacy.section7Bullet3')}</BulletPoint>
      <BulletPoint>{t('legal.privacy.section7Bullet4')}</BulletPoint>

      <SectionTitle>{t('legal.privacy.section8Title')}</SectionTitle>
      <Paragraph>{t('legal.privacy.section8Text')}</Paragraph>
    </LegalPageLayout>
  );
}
