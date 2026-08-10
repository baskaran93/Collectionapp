import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { SPACING, RADIUS, useTheme } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { getCurrentUser } from '../../constants/session';

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const INPUT_STYLE = {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  };

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => { getCurrentUser().then(setCurrentUser); }, []);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const inputRefs = useRef([]);
  const focusedIndexRef = useRef(null);
  const isMountedRef = useRef(true);
  const focusTimeoutRef = useRef(null);

  const adjustScrollForFocusedField = () => {
    if (!isMountedRef.current) return;
    const idx = focusedIndexRef.current;
    const node = idx != null ? inputRefs.current[idx] : null;
    const scroller = scrollRef.current;
    if (!node || !scroller || !node.measure || !scroller.measure) return;
    scroller.measure((sx, sy, sw, sh, spx, spy) => {
      if (!isMountedRef.current) return;
      node.measure((x, y, w, h, px, py) => {
        if (!isMountedRef.current) return;
        const visibleBottom = spy + sh;
        const fieldBottom = py + h;
        if (fieldBottom > visibleBottom - 16) {
          const delta = fieldBottom - visibleBottom + 24;
          scroller.scrollTo({ y: scrollYRef.current + delta, animated: true });
        }
      });
    });
  };

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', adjustScrollForFocusedField);
    return () => {
      isMountedRef.current = false;
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
      sub.remove();
    };
  }, []);

  const handleFocus = (idx) => {
    focusedIndexRef.current = idx;
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    focusTimeoutRef.current = setTimeout(adjustScrollForFocusedField, 50);
  };

  const handleChangePassword = async () => {
    if (!currentUser?.Username) {
      Alert.alert('Error', 'Could not determine the logged-in user. Please log in again.');
      return;
    }
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation', 'Please fill in all three password fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'New password and confirmation do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Username: currentUser.Username,
          OldPassword: oldPassword,
          NewPassword: newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to change password.');
      }
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Change Password</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionSubtitle}>
            {currentUser?.Username ? `Signed in as ${currentUser.Username}` : 'Update your account password'}
          </Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Current Password</Text>
            <TextInput
              ref={(r) => { inputRefs.current[0] = r; }}
              onFocus={() => handleFocus(0)}
              style={INPUT_STYLE}
              placeholder="Enter current password"
              placeholderTextColor={colors.textMuted}
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>New Password</Text>
            <TextInput
              ref={(r) => { inputRefs.current[1] = r; }}
              onFocus={() => handleFocus(1)}
              style={INPUT_STYLE}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>Confirm New Password</Text>
            <TextInput
              ref={(r) => { inputRefs.current[2] = r; }}
              onFocus={() => handleFocus(2)}
              style={INPUT_STYLE}
              placeholder="Re-enter new password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.primaryBtn, changingPassword && styles.primaryBtnDisabled]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  content: { padding: SPACING.md, paddingBottom: 40 },
  sectionSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: SPACING.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
