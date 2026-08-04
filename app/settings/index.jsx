import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Languages, KeyRound, Users, ChevronRight } from 'lucide-react-native';
import { useTranslation } from '../../constants/i18n';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { getCurrentUser } from '../../constants/session';

function MenuRow({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowMid}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <ChevronRight size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t, languageLabel } = useTranslation();

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => { getCurrentUser().then(setCurrentUser); }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings')}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <MenuRow
            icon={<Languages size={18} color={COLORS.primary} />}
            title={t('selectLanguage')}
            subtitle={languageLabel}
            onPress={() => router.push('/settings/language')}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon={<KeyRound size={18} color={COLORS.primary} />}
            title="Change Password"
            subtitle={currentUser?.Username ? `Signed in as ${currentUser.Username}` : 'Update your account password'}
            onPress={() => router.push('/settings/change-password')}
          />
          {currentUser?.Role === 'Admin' && (
            <>
              <View style={styles.rowDivider} />
              <MenuRow
                icon={<Users size={18} color={COLORS.primary} />}
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  rowTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  rowSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.md + 36 + 12 },
});
