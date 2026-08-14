import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera, Plus, FileText, Trash2 } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenHeader from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';
import { useTranslation } from '../../constants/i18n';
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

export default function PartyDetailScreen() {
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

  const { t } = useTranslation();
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
  const [form, setForm] = useState({
    PartyName: '',
    ContactPerson: '',
    Phone: '',
    Email: '',
    Address: '',
    GstNumber: '',
  });

  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docUploading, setDocUploading] = useState(false);

  const loadDocuments = () => {
    if (isNew) return;
    fetch(`${API_BASE}/api/parties/${id}/documents`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setDocuments)
      .catch(() => {});
  };

  useEffect(() => {
    if (!isNew) {
      fetch(`${API_BASE}/api/parties/${id}`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => {
          setForm({
            PartyName: data.PartyName || '',
            ContactPerson: data.ContactPerson || '',
            Phone: data.Phone || '',
            Email: data.Email || '',
            Address: data.Address || '',
            GstNumber: data.GstNumber || '',
          });
          setPhotoUrl(data.ProfilePhotoUrl || null);
          setDocuments(data.Documents || []);
        })
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

  const uploadPhotoAsync = async (asset) => {
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      const res = await fetch(`${API_BASE}/api/parties/${id}/photo`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPhotoUrl(data.ProfilePhotoUrl || null);
    } catch {
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets?.[0]) uploadPhotoAsync(result.assets[0]);
  };

  const launchLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets?.[0]) uploadPhotoAsync(result.assets[0]);
  };

  const handleRemovePhoto = async () => {
    setPhotoUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/parties/${id}/photo`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setPhotoUrl(null);
    } catch {
      Alert.alert('Error', 'Failed to remove photo. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePickPhoto = () => {
    if (photoUploading) return;
    Alert.alert('Profile Photo', 'Choose a source', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: launchCamera },
      { text: 'Choose from Gallery', onPress: launchLibrary },
      ...(photoUrl ? [{ text: 'Remove Photo', style: 'destructive', onPress: handleRemovePhoto }] : []),
    ]);
  };

  const uploadDocumentAsync = async (asset) => {
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.name || `document_${Date.now()}`,
      type: asset.mimeType || 'application/octet-stream',
    });
    try {
      const res = await fetch(`${API_BASE}/api/parties/${id}/documents`, { method: 'POST', body: formData });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handlePickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const assets = result.assets || [];
      if (!assets.length) return;
      setDocUploading(true);
      let failed = 0;
      for (const asset of assets) {
        const ok = await uploadDocumentAsync(asset);
        if (!ok) failed += 1;
      }
      loadDocuments();
      if (failed) Alert.alert('Upload issue', `${failed} of ${assets.length} file(s) failed to upload.`);
    } catch {
      Alert.alert('Error', 'Failed to pick document(s).');
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDocument = (docId) => {
    Alert.alert('Delete Document', 'Remove this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_BASE}/api/parties/${id}/documents/${docId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            setDocuments((prev) => prev.filter((d) => d.Id !== docId));
          } catch {
            Alert.alert('Error', 'Failed to delete document. Please try again.');
          }
        },
      },
    ]);
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
            <View style={styles.photoRow}>
              <TouchableOpacity
                onPress={isNew ? undefined : handlePickPhoto}
                disabled={isNew || photoUploading}
                activeOpacity={0.7}
                style={styles.photoTouchable}
              >
                <Avatar uri={photoUrl} name={form.PartyName || '?'} size={72} radius={36} />
                {!isNew && (
                  <View style={[styles.photoBadge, { backgroundColor: colors.primary, borderColor: colors.white }]}>
                    {photoUploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Camera size={13} color="#fff" />
                    )}
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.photoInfo}>
                <Text style={styles.sectionTitle}>Profile Photo</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {isNew ? 'Save the party first to add a photo.' : 'Tap the photo to change or remove it.'}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t('basicInformation') || 'Basic Information'}</Text>

            <Field label={t('party') + ' / Company Name'} required>
              <TextInput
                ref={(r) => { inputRefs.current[0] = r; }}
                onFocus={() => handleFocus(0)}
                style={INPUT_STYLE}
                placeholder={t('enterPartyName') || 'e.g. Acme Corporation'}
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
                value={form.Address}
                onChangeText={set('Address')}
                multiline
                numberOfLines={3}
              />
            </Field>
          </View>

          {isNew ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Proof Documents</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>
                Save this party first, then open it again to attach proof documents.
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.docHeader}>
                <Text style={styles.sectionTitle}>Proof Documents</Text>
                <TouchableOpacity
                  onPress={handlePickDocuments}
                  disabled={docUploading}
                  style={[styles.addDocBtn, { borderColor: colors.primary }]}
                >
                  {docUploading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Plus size={15} color={colors.primary} />
                  )}
                  <Text style={[styles.addDocText, { color: colors.primary }]}>Add</Text>
                </TouchableOpacity>
              </View>

              {documents.length === 0 ? (
                <Text style={{ fontSize: 13, color: colors.textMuted }}>No documents uploaded yet.</Text>
              ) : (
                documents.map((doc) => (
                  <View key={doc.Id} style={[styles.docRow, { borderColor: colors.border }]}>
                    <FileText size={18} color={colors.textSecondary} />
                    <Text style={[styles.docName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {doc.FileName}
                    </Text>
                    <TouchableOpacity onPress={() => handleDeleteDocument(doc.Id)} hitSlop={8}>
                      <Trash2 size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: SPACING.md },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  photoTouchable: { position: 'relative' },
  photoBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
  },
  photoInfo: { flex: 1, marginLeft: SPACING.md },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  addDocBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  addDocText: { fontSize: 13, fontWeight: '600' },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  docName: { flex: 1, fontSize: 14 },
});
