import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Languages, KeyRound, Users, Tag, ChevronRight } from 'lucide-react-native';
import { useTranslation } from '../../constants/i18n';
import { SPACING, RADIUS, useTheme } from '../../constants/theme';
import { getCurrentUser } from '../../constants/session';

function MenuRow({ icon, title, subtitle, onPress }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowMid}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t, languageLabel } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => { getCurrentUser().then(setCurrentUser); }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings')}</Text>
      </View>

      <View style={[styles.content, { paddingBottom: SPACING.md + insets.bottom }]}>
        <View style={styles.card}>
          <MenuRow
            icon={<Languages size={18} color={colors.primary} />}
            title={t('selectLanguage')}
            subtitle={languageLabel}
            onPress={() => router.push('/settings/language')}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon={<KeyRound size={18} color={colors.primary} />}
            title="Change Password"
            subtitle={currentUser?.Username ? `Signed in as ${currentUser.Username}` : 'Update your account password'}
            onPress={() => router.push('/settings/change-password')}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon={<Tag size={18} color={colors.primary} />}
            title="Loan Types"
            subtitle="Manage loan categories"
            onPress={() => router.push('/loantypes')}
          />
          {currentUser?.Role === 'Admin' && (
            <>
              <View style={styles.rowDivider} />
              <MenuRow
                icon={<Users size={18} color={colors.primary} />}
                title="User Management"
                subtitle="View, add, and edit team logins"
                onPress={() => router.push('/user')}
              />
            </>
          )}
        </View>
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
  card: {
    backgroundColor: colors.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowMid: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  rowSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: colors.border, marginLeft: SPACING.md + 36 + 12 },
});
