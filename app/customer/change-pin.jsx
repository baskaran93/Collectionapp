import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import ScreenHeader from '../../components/ScreenHeader';
import { SPACING, RADIUS, useTheme } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { getCustomerToken, clearCustomerSession } from '../../constants/customerSession';

function Field({ label, children }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function ChangePinScreen() {
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
    letterSpacing: 4,
    fontWeight: '700',
    color: colors.textPrimary,
  };

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!oldPin.trim()) {
      Alert.alert('Validation', 'Enter your current PIN.');
      return;
    }
    if (!/^\d{4,6}$/.test(newPin.trim())) {
      Alert.alert('Validation', 'New PIN must be 4-6 digits.');
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      Alert.alert('Validation', 'New PIN and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      const token = await getCustomerToken();
      if (!token) {
        await clearCustomerSession();
        router.replace('/customer/login');
        return;
      }
      const res = await fetch(`${API_BASE}/api/customer/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ OldPin: oldPin.trim(), NewPin: newPin.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.detail || 'Could not change PIN.');
        return;
      }
      Alert.alert('Success', 'Your PIN has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Connection Error', 'Could not reach the server. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.root}>
        <ScreenHeader title="Change PIN" saving={saving} onSave={handleSave} saveLabel="Save" />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Field label="Current PIN">
              <TextInput
                style={INPUT_STYLE}
                placeholder="- - - -"
                placeholderTextColor={colors.textMuted}
                value={oldPin}
                onChangeText={setOldPin}
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
              />
            </Field>
            <Field label="New PIN">
              <TextInput
                style={INPUT_STYLE}
                placeholder="- - - -"
                placeholderTextColor={colors.textMuted}
                value={newPin}
                onChangeText={setNewPin}
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
              />
            </Field>
            <Field label="Confirm New PIN">
              <TextInput
                style={INPUT_STYLE}
                placeholder="- - - -"
                placeholderTextColor={colors.textMuted}
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
                onSubmitEditing={handleSave}
              />
            </Field>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: SPACING.md },
  card: {
    backgroundColor: colors.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
});
