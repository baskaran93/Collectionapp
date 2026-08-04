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
import { useLocalSearchParams, router } from 'expo-router';
import ScreenHeader from '../../components/ScreenHeader';
import { useTranslation } from '../../constants/i18n';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/api';

function Field({ label, required, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: COLORS.danger }}> *</Text> : null}
      </Text>
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

export default function PartyDetailScreen() {
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

  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const isNew = !id || id === 'new';

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    PartyName: '',
    ContactPerson: '',
    Phone: '',
    Email: '',
    Address: '',
    GstNumber: '',
  });

  useEffect(() => {
    if (!isNew) {
      fetch(`${API_BASE}/api/parties/${id}`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => setForm({
          PartyName: data.PartyName || '',
          ContactPerson: data.ContactPerson || '',
          Phone: data.Phone || '',
          Email: data.Email || '',
          Address: data.Address || '',
          GstNumber: data.GstNumber || '',
        }))
        .catch(() => {
          Alert.alert('Error', 'Could not load party details.');
          router.back();
        });
    }
  }, [id, isNew]);

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.PartyName.trim()) {
      Alert.alert('Validation', 'Party name is required.');
      return;
    }
    const phoneDigits = form.Phone.replace(/\D/g, '');
    const normalizedPhone = phoneDigits.length === 12 && phoneDigits.startsWith('91')
      ? phoneDigits.slice(2)
      : phoneDigits;
    if (!form.Phone.trim()) {
      Alert.alert('Validation', 'Phone number is required.');
      return;
    }
    if (normalizedPhone.length !== 10 || !/^[6-9]/.test(normalizedPhone)) {
      Alert.alert('Validation', 'Enter a valid 10-digit mobile number.');
      return;
    }
    setSaving(true);
    try {
      const url = isNew ? `${API_BASE}/api/parties` : `${API_BASE}/api/parties/${id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save party. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Party', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const res = await fetch(`${API_BASE}/api/parties/${id}`, { method: 'DELETE' });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.detail || 'Failed to delete party.');
            }
            router.replace('/(tabs)/parties');
          } catch (e) {
            Alert.alert('Unable to Delete Party', e.message || 'Failed to delete party.');
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
          title={isNew ? t('newParty') : t('editParty')}
          saving={saving}
          showDelete={!isNew}
          onDelete={handleDelete}
          onSave={handleSave}
          saveLabel={t('save')}
        />

        <ScrollView ref={scrollRef} onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('basicInformation') || 'Basic Information'}</Text>

            <Field label={t('party') + ' / Company Name'} required>
              <TextInput
                ref={(r) => { inputRefs.current[0] = r; }}
                onFocus={() => handleFocus(0)}
                style={INPUT_STYLE}
                placeholder={t('enterPartyName') || 'e.g. Acme Corporation'}
                placeholderTextColor={COLORS.textMuted}
                value={form.PartyName}
                onChangeText={set('PartyName')}
              />
            </Field>

            <Field label="Contact Person">
              <TextInput
                ref={(r) => { inputRefs.current[1] = r; }}
                onFocus={() => handleFocus(1)}
                style={INPUT_STYLE}
                placeholder="Full Name"
                placeholderTextColor={COLORS.textMuted}
                value={form.ContactPerson}
                onChangeText={set('ContactPerson')}
              />
            </Field>

            <Field label="GST / Tax Number">
              <TextInput
                ref={(r) => { inputRefs.current[2] = r; }}
                onFocus={() => handleFocus(2)}
                style={INPUT_STYLE}
                placeholder="e.g. 29ABCDE1234F1Z5"
                placeholderTextColor={COLORS.textMuted}
                value={form.GstNumber}
                onChangeText={set('GstNumber')}
                autoCapitalize="characters"
              />
            </Field>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('contactLocation') || 'Contact & Location'}</Text>

            <Field label={t('phone') || 'Phone Number'} required>
              <TextInput
                ref={(r) => { inputRefs.current[3] = r; }}
                onFocus={() => handleFocus(3)}
                style={INPUT_STYLE}
                placeholder="+91 98765 43210"
                placeholderTextColor={COLORS.textMuted}
                value={form.Phone}
                onChangeText={set('Phone')}
                keyboardType="phone-pad"
              />
            </Field>

            <Field label="Email Address">
              <TextInput
                ref={(r) => { inputRefs.current[4] = r; }}
                onFocus={() => handleFocus(4)}
                style={INPUT_STYLE}
                placeholder="contact@company.com"
                placeholderTextColor={COLORS.textMuted}
                value={form.Email}
                onChangeText={set('Email')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Field>

            <Field label="Billing Address">
              <TextInput
                ref={(r) => { inputRefs.current[5] = r; }}
                onFocus={() => handleFocus(5)}
                style={[INPUT_STYLE, { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Complete address including street, city, and zip code"
                placeholderTextColor={COLORS.textMuted}
                value={form.Address}
                onChangeText={set('Address')}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 300 },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  field: { marginBottom: SPACING.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
});
