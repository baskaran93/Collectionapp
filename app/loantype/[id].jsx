import React, { useState, useEffect, useMemo } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import ScreenHeader from '../../components/ScreenHeader';
import { SPACING, RADIUS, useTheme } from '../../constants/theme';
import { API_BASE } from '../../constants/api';

function Field({ label, required, children }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

export default function LoanTypeDetailScreen() {
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
  const { id } = useLocalSearchParams();
  const isNew = !id || id === 'new';

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ TypeName: '', Description: '' });

  useEffect(() => {
    if (!isNew) {
      fetch(`${API_BASE}/api/loan-types/${id}`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => setForm({
          TypeName: data.TypeName || '',
          Description: data.Description || '',
        }))
        .catch(() => {
          Alert.alert('Error', 'Could not load loan type.');
          router.back();
        });
    }
  }, [id, isNew]);

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.TypeName.trim()) {
      Alert.alert('Validation', 'Loan type name is required.');
      return;
    }
    setSaving(true);
    try {
      const url = isNew ? `${API_BASE}/api/loan-types` : `${API_BASE}/api/loan-types/${id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to save loan type.');
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save loan type.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Loan Type', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const res = await fetch(`${API_BASE}/api/loan-types/${id}`, { method: 'DELETE' });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.detail || 'Failed to delete loan type.');
            }
            router.replace('/loantypes');
          } catch (e) {
            Alert.alert('Unable to Delete Loan Type', e.message || 'Failed to delete loan type.');
            setSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.root}>
        <ScreenHeader
          title={isNew ? 'New Loan Type' : 'Edit Loan Type'}
          saving={saving}
          showDelete={!isNew}
          onDelete={handleDelete}
          onSave={handleSave}
          saveLabel="Save"
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Field label="Type Name" required>
              <TextInput
                style={INPUT_STYLE}
                placeholder="e.g. Personal, Business, Gold"
                placeholderTextColor={colors.textMuted}
                value={form.TypeName}
                onChangeText={set('TypeName')}
              />
            </Field>

            <Field label="Description">
              <TextInput
                style={[INPUT_STYLE, { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Optional notes about this loan type"
                placeholderTextColor={colors.textMuted}
                value={form.Description}
                onChangeText={set('Description')}
                multiline
                numberOfLines={3}
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
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 300 },
  card: {
    backgroundColor: colors.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
});
