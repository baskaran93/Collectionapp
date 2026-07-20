import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation, LANGUAGES } from '../constants/i18n';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage, languageLabel } = useTranslation();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings')}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t('selectLanguage')}</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  content: { padding: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  sectionSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.md },
  languageCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  languageCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  languageLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  languageLabelActive: { color: COLORS.primary },
  languageCurrent: { marginTop: 6, fontSize: 13, color: COLORS.textSecondary },
});
