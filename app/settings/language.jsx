import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation, LANGUAGES } from '../../constants/i18n';
import { SPACING, RADIUS, useTheme } from '../../constants/theme';

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage, languageLabel } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('selectLanguage')}</Text>
      </View>

      <View style={[styles.content, { paddingBottom: SPACING.md + insets.bottom }]}>
        <Text style={styles.sectionSubtitle}>{t('languageSelection')}</Text>
        {Object.entries(LANGUAGES).map(([locale, label]) => {
          const active = locale === language;
          return (
            <TouchableOpacity
              key={locale}
              style={[styles.languageCard, active && styles.languageCardActive]}
              onPress={() => setLanguage(locale)}
            >
              <Text style={[styles.languageLabel, active && styles.languageLabelActive]}>{label}</Text>
              {active ? <Text style={styles.languageCurrent}>{languageLabel}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  content: { padding: SPACING.md },
  sectionSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: SPACING.md },
  languageCard: {
    backgroundColor: colors.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#EEF2FF',
  },
  languageLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  languageLabelActive: { color: colors.primary },
  languageCurrent: { marginTop: 6, fontSize: 13, color: colors.textSecondary },
});
