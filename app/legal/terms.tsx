// Terms of Service screen
import { useTranslation } from 'react-i18next';
import LegalPageLayout, {
  LastUpdated,
  SectionTitle,
  Paragraph,
  BulletPoint,
} from '../../src/components/LegalPageLayout';

export default function TermsOfServiceScreen() {
  const { t } = useTranslation();

  return (
    <LegalPageLayout title={t('legal.terms.title')}>
      <LastUpdated date={t('legal.updateDate')} />

      <SectionTitle>{t('legal.terms.section1Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section1Text')}</Paragraph>

      <SectionTitle>{t('legal.terms.section2Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section2Text')}</Paragraph>

      <SectionTitle>{t('legal.terms.section3Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section3Intro')}</Paragraph>
      <BulletPoint>{t('legal.terms.section3Bullet1')}</BulletPoint>
      <BulletPoint>{t('legal.terms.section3Bullet2')}</BulletPoint>
      <BulletPoint>{t('legal.terms.section3Bullet3')}</BulletPoint>

      <SectionTitle>{t('legal.terms.section4Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section4Intro')}</Paragraph>
      <BulletPoint>{t('legal.terms.section4Bullet1')}</BulletPoint>
      <BulletPoint>{t('legal.terms.section4Bullet2')}</BulletPoint>
      <BulletPoint>{t('legal.terms.section4Bullet3')}</BulletPoint>

      <SectionTitle>{t('legal.terms.section5Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section5Intro')}</Paragraph>
      <BulletPoint>{t('legal.terms.section5Bullet1')}</BulletPoint>
      <BulletPoint>{t('legal.terms.section5Bullet2')}</BulletPoint>
      <BulletPoint>{t('legal.terms.section5Bullet3')}</BulletPoint>
      <BulletPoint>{t('legal.terms.section5Bullet4')}</BulletPoint>
      <BulletPoint>{t('legal.terms.section5Bullet5')}</BulletPoint>

      <SectionTitle>{t('legal.terms.section6Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section6Text')}</Paragraph>

      <SectionTitle>{t('legal.terms.section7Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section7Text')}</Paragraph>

      <SectionTitle>{t('legal.terms.section8Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section8Text')}</Paragraph>

      <SectionTitle>{t('legal.terms.section9Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section9Text')}</Paragraph>

      <SectionTitle>{t('legal.terms.section10Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section10Text')}</Paragraph>

      <SectionTitle>{t('legal.terms.section11Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section11Text')}</Paragraph>

      <SectionTitle>{t('legal.terms.section12Title')}</SectionTitle>
      <Paragraph>{t('legal.terms.section12Text')}</Paragraph>
    </LegalPageLayout>
  );
}
