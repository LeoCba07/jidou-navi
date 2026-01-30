// Hook for translating badge names and descriptions
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

type BadgeTranslation = {
  name: string;
  description: string;
};

export function useBadgeTranslation() {
  const { t, i18n } = useTranslation();

  const getBadgeTranslation = useCallback(
    (slug: string, fallbackName?: string, fallbackDescription?: string): BadgeTranslation => {
      const translationKey = `badges.items.${slug}`;
      const nameKey = `${translationKey}.name`;
      const descKey = `${translationKey}.description`;

      // Check if translation exists
      const translatedName = i18n.exists(nameKey) ? t(nameKey) : fallbackName || slug;
      const translatedDesc = i18n.exists(descKey) ? t(descKey) : fallbackDescription || '';

      return {
        name: translatedName,
        description: translatedDesc,
      };
    },
    [t, i18n]
  );

  return { getBadgeTranslation };
}
