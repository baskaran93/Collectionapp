import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenHeader from '../../components/ScreenHeader';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { getCurrentUser } from '../../constants/session';

const ROLE_OPTIONS = ['User', 'Admin'];

function Field({ label, required, hint, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: COLORS.danger }}> *</Text> : null}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

const INPUT_STYLE = {
  backgroundColor: COLORS.background,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: RADIUS.md,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: COLORS.textPrimary,
};

export default function UserDetailScreen() {
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const inputRefs = useRef([]);
  const focusedIndexRef = useRef(null);

  const adjustScrollForFocusedField = () => {
    const idx = focusedIndexRef.current;
    const node = idx != null ? inputRefs.current[idx] : null;
    const scroller = scrollRef.current;
    if (!node || !scroller || !node.measure || !scroller.measure) return;
    scroller.measure((sx, sy, sw, sh, spx, spy) => {
      node.measure((x, y, w, h, px, py) => {
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
    return () => sub.remove();
  }, []);

  const handleFocus = (idx) => {
    focusedIndexRef.current = idx;
    setTimeout(adjustScrollForFocusedField, 50);
  };

  const { id } = useLocalSearchParams();
  const isNew = !id || id === 'new';

  const [checkingAccess, setCheckingAccess] = useState(true);
  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u?.Role !== 'Admin') {
        Alert.alert('Access Denied', 'Only Admin users can manage logins.');
        router.back();
        return;
      }
      setCheckingAccess(false);
    });
  }, []);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ Username: '', Password: '', ConfirmPassword: '', Role: 'User' });
  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    if (!checkingAccess && !isNew) {
      fetch(`${API_BASE}/api/users/${id}`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => setForm((p) => ({ ...p, Username: data.Username || '', Role: data.Role || 'User' })))
        .catch(() => {
          Alert.alert('Error', 'Could not load user details.');
          router.back();
        });
    }
  }, [id, isNew, checkingAccess]);

  const handleSave = async () => {
    const username = form.Username.trim();
    if (!username) {
      Alert.alert('Validation', 'Username is required.');
      return;
    }
    if (isNew || form.Password || form.ConfirmPassword) {
      if (form.Password.length < 6) {
        Alert.alert('Validation', 'Password must be at least 6 characters.');
        return;
      }
      if (form.Password !== form.ConfirmPassword) {
        Alert.alert('Validation', 'Password and confirmation do not match.');
        return;
      }
    }
    setSaving(true);
    try {
      const url = isNew ? `${API_BASE}/api/users` : `${API_BASE}/api/users/${id}`;
      const payload = isNew
        ? { Username: username, Password: form.Password, Role: form.Role }
        : { Username: username, Role: form.Role, ...(form.Password ? { Password: form.Password } : {}) };
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to save user.');
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  if (checkingAccess) return null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.root}>
        <ScreenHeader title={isNew ? 'Create User' : 'Edit User'} saving={saving} onSave={handleSave} saveLabel="Save" />

        <ScrollView
          ref={scrollRef}
          onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Field label="Username" required>
              <TextInput
                ref={(r) => { inputRefs.current[0] = r; }}
                onFocus={() => handleFocus(0)}
                style={INPUT_STYLE}
                placeholder="e.g. rajesh.agent"
                placeholderTextColor={COLORS.textMuted}
                value={form.Username}
                onChangeText={set('Username')}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>

            <Field label="Password" required={isNew} hint={isNew ? null : 'Leave blank to keep the current password'}>
              <TextInput
                ref={(r) => { inputRefs.current[1] = r; }}
                onFocus={() => handleFocus(1)}
                style={INPUT_STYLE}
                placeholder={isNew ? 'At least 6 characters' : 'New password (optional)'}
                placeholderTextColor={COLORS.textMuted}
                value={form.Password}
                onChangeText={set('Password')}
                secureTextEntry
              />
            </Field>

            <Field label="Confirm Password" required={isNew}>
              <TextInput
                ref={(r) => { inputRefs.current[2] = r; }}
                onFocus={() => handleFocus(2)}
                style={INPUT_STYLE}
                placeholder="Re-enter password"
                placeholderTextColor={COLORS.textMuted}
                value={form.ConfirmPassword}
                onChangeText={set('ConfirmPassword')}
                secureTextEntry
              />
            </Field>

            <Field label="Role">
              <View style={styles.pickerWrap}>
                <Picker selectedValue={form.Role} onValueChange={set('Role')} style={styles.picker}>
                  {ROLE_OPTIONS.map((r) => <Picker.Item key={r} label={r} value={r} />)}
                </Picker>
              </View>
            </Field>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  field: { marginBottom: SPACING.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  hint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  pickerWrap: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, overflow: 'hidden',
  },
  picker: { height: 48, color: COLORS.textPrimary },
});
