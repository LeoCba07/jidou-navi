// Reusable layout for legal pages (Privacy Policy, Terms of Service)
import { ReactNode } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

type Props = {
  title: string;
  children: ReactNode;
};

export default function LegalPageLayout({ title, children }: Props) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {children}
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

// Exported style components for content
export function LastUpdated({ date }: { date: string }) {
  return <Text style={styles.lastUpdated}>Last updated: {date}</Text>;
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Paragraph({ children }: { children: string }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

export function BulletPoint({ children }: { children: string }) {
  return <Text style={styles.bulletPoint}>• {children}</Text>;
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
    minWidth: 80,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Silkscreen',
    color: '#FF4B4B',
  },
  title: {
    fontSize: 20,
    fontFamily: 'DotGothic16',
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
    fontFamily: 'Inter',
    color: '#999',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#555',
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#555',
    lineHeight: 22,
    marginLeft: 8,
    marginBottom: 4,
  },
  spacer: {
    height: 40,
  },
});
