import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Share,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { CalendarDays } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenHeader from '../../components/ScreenHeader';
import { useTranslation } from '../../constants/i18n';
import { SPACING, RADIUS, useTheme } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { queueCollection } from '../../constants/offlineQueue';

const MODE_OPTIONS = [
  { value: 'Cash',          label: 'Cash' },
  { value: 'UPI',           label: 'UPI' },
  { value: 'Bank Transfer', label: 'Bank' },
  { value: 'Cheque',        label: 'Cheque' },
];
const STATUS_OPTIONS = ['Received', 'Pending', 'Bounced'];

function buildReceiptText(payload, party) {
  const dateStr = new Date(payload.CollectionDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const lines = [
    'Payment Receipt',
    '----------------------------',
    `Party: ${party?.PartyName || '-'}`,
    `Amount: ₹${parseFloat(payload.Amount).toLocaleString('en-IN')}`,
    `Date: ${dateStr}`,
    `Mode: ${payload.PaymentMode}`,
  ];
  if (payload.ReferenceNo) lines.push(`Reference: ${payload.ReferenceNo}`);
  lines.push('----------------------------', 'Thank you!');
  return lines.join('\n');
}

function Field({ label, required, hint, children }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function DateField({ label, required, value, onChange }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [show, setShow] = useState(false);
  const date = value ? new Date(value) : new Date();
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      </View>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Text style={[styles.dateBtnText, !value && { color: colors.textMuted }]}>
          {value || 'Select date'}
        </Text>
        <CalendarDays size={16} color={colors.primary} />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShow(Platform.OS === 'ios');
            if (selected) onChange(selected.toISOString().split('T')[0]);
          }}
        />
      )}
    </View>
  );
}

export default function CollectionDetailScreen() {
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
  const INPUT = {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  };
  const { id, loanId: loanIdParam, partyId: partyIdParam } = useLocalSearchParams();
  const isNew = !id || id === 'new';

  const [parties, setParties] = useState([]);
  const [loans, setLoans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    PartyId: partyIdParam ? String(partyIdParam) : '',
    LoanId: loanIdParam ? String(loanIdParam) : '',
    CollectionDate: new Date().toISOString().split('T')[0],
    Amount: '',
    PaymentMode: 'Cash',
    ReferenceNo: '',
    Status: 'Received',
    Notes: '',
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/parties`)
      .then((r) => r.json())
      .then((d) => setParties(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const fetchPartyLoans = useCallback(async (pId) => {
    if (!pId) { setLoans([]); return; }
    try {
      const res = await fetch(`${API_BASE}/api/parties/${pId}/loans`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLoans(Array.isArray(data) ? data : []);
    } catch {
      setLoans([]);
    }
  }, []);

  useEffect(() => { fetchPartyLoans(form.PartyId); }, [form.PartyId, fetchPartyLoans]);

  useEffect(() => {
    if (!isNew) {
      fetch(`${API_BASE}/api/collections/${id}`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((d) => {
          setForm({
            PartyId: String(d.PartyId || ''),
            LoanId: String(d.LoanId || ''),
            CollectionDate: d.CollectionDate || '',
            Amount: String(d.Amount || ''),
            PaymentMode: d.PaymentMode || 'Cash',
            ReferenceNo: d.ReferenceNo || '',
            Status: d.Status || 'Received',
            Notes: d.Notes || '',
          });
        })
        .catch(() => { Alert.alert('Error', 'Could not load collection.'); router.back(); });
    }
  }, [id, isNew]);

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const handleLoanChange = (lId) => {
    const sel = loans.find((l) => String(l.Id) === lId);
    setForm((p) => ({
      ...p,
      LoanId: lId,
      Amount: sel ? String(sel.InstallmentAmount) : p.Amount,
    }));
  };

  const handleSave = async () => {
    if (!form.PartyId) { Alert.alert('Validation', 'Please select a party.'); return; }
    if (!form.LoanId) { Alert.alert('Validation', 'Please select a loan.'); return; }
    if (!form.Amount || parseFloat(form.Amount) <= 0) { Alert.alert('Validation', 'Enter a valid amount.'); return; }
    const needsRef = form.PaymentMode !== 'Cash';
    if (needsRef && !form.ReferenceNo.trim()) {
      Alert.alert('Validation', `Reference No. is required for ${form.PaymentMode}.`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        PartyId: parseInt(form.PartyId),
        LoanId: parseInt(form.LoanId),
        Amount: parseFloat(form.Amount),
        ReferenceNo: needsRef ? form.ReferenceNo.trim() : null,
        Notes: form.Notes.trim() || null,
      };
      const url = isNew ? `${API_BASE}/api/collections` : `${API_BASE}/api/collections/${id}`;
      let res;
      try {
        res = await fetch(url, {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (networkError) {
        if (!isNew) throw networkError;
        await queueCollection(payload);
        const party = parties.find((p) => String(p.Id) === form.PartyId);
        Alert.alert(
          'Saved Offline',
          `No connection right now — this ₹${parseFloat(payload.Amount).toLocaleString('en-IN')} collection for ${party?.PartyName || 'party'} is queued and will sync automatically once you're back online.`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
        return;
      }
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed'); }
      if (isNew) {
        const party = parties.find((p) => String(p.Id) === form.PartyId);
        Alert.alert(
          'Collection Recorded',
          `₹${parseFloat(payload.Amount).toLocaleString('en-IN')} recorded for ${party?.PartyName || 'party'}.`,
          [
            { text: 'Done', onPress: () => router.back() },
            {
              text: 'Share Receipt',
              onPress: async () => {
                try {
                  await Share.share({ message: buildReceiptText(payload, party) });
                } catch {
                  // user dismissed share sheet — ignore
                } finally {
                  router.back();
                }
              },
            },
          ],
        );
      } else {
        router.back();
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save collection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Collection', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const res = await fetch(`${API_BASE}/api/collections/${id}`, { method: 'DELETE' });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.detail || 'Failed to delete collection.');
            }
            router.replace('/(tabs)/collections');
          } catch (e) {
            Alert.alert('Unable to Delete', e.message || 'Failed to delete collection.');
            setSaving(false);
          }
        },
      },
    ]);
  };

  const selectedLoan = loans.find((l) => String(l.Id) === form.LoanId);
  const needsRef = form.PaymentMode !== 'Cash';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.root}>
        <ScreenHeader
          title={isNew ? t('collect') || 'Record Collection' : t('editCollection')}
          saving={saving}
          showDelete={!isNew}
          onDelete={handleDelete}
          onSave={handleSave}
          saveLabel={t('save')}
        />

        <ScrollView ref={scrollRef} onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Account */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('accountInformation') || 'Account Information'}</Text>

            <Field label={t('party') || 'Customer Party'} required>
              <View style={[styles.pickerWrap, !isNew && styles.pickerDisabled]}>
                <Picker
                  selectedValue={form.PartyId}
                  onValueChange={isNew ? set('PartyId') : undefined}
                  enabled={isNew}
                  style={styles.picker}
                >
                  <Picker.Item label="— Select a Party —" value="" />
                  {parties.map((p) => (
                    <Picker.Item key={p.Id} label={`${p.PartyName} (Bal: ₹${Number(p.Balance || 0).toLocaleString('en-IN')})`} value={String(p.Id)} />
                  ))}
                </Picker>
              </View>
            </Field>

            <Field label={t('loanReference') || 'Loan Reference'} required>
              <View style={[styles.pickerWrap, (!form.PartyId || !isNew) && styles.pickerDisabled]}>
                <Picker
                  selectedValue={form.LoanId}
                  onValueChange={isNew ? handleLoanChange : undefined}
                  enabled={!!form.PartyId && isNew}
                  style={styles.picker}
                >
                  <Picker.Item
                      label={!form.PartyId ? (t('selectParty') || '— Select a party first —') : loans.length === 0 ? (t('noActiveLoans') || '— No active loans —') : (t('selectLoan') || '— Select a Loan —')}
                      value=""
                    />
                  {loans.map((l) => (
                    <Picker.Item
                      key={l.Id}
                      label={`Ref #${l.Id} - ₹${Number(l.LoanAmount).toLocaleString('en-IN')} (Inst: ₹${Number(l.InstallmentAmount).toLocaleString('en-IN')})`}
                      value={String(l.Id)}
                    />
                  ))}
                </Picker>
              </View>
            </Field>

            {selectedLoan && (
              <View style={styles.loanSummary}>
                <Text style={styles.loanSummaryTitle}>{t('activeLoanSummary') || 'Active Loan Summary'}</Text>
                <View style={styles.loanRow}><Text style={styles.loanKey}>Loan Amount</Text><Text style={styles.loanVal}>₹{Number(selectedLoan.LoanAmount).toLocaleString('en-IN')}</Text></View>
                <View style={styles.loanRow}><Text style={styles.loanKey}>Installments</Text><Text style={styles.loanVal}>{selectedLoan.NoOfInstallments} × {selectedLoan.InstallPeriod}</Text></View>
                <View style={styles.loanRow}><Text style={styles.loanKey}>Per Installment</Text><Text style={[styles.loanVal, { color: colors.success, fontWeight: '700' }]}>₹{Number(selectedLoan.InstallmentAmount).toLocaleString('en-IN')}</Text></View>
              </View>
            )}
          </View>

          {/* Payment Details */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('paymentDetails') || 'Payment Details'}</Text>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <DateField
                  label={t('collectionDate') || 'Collection Date'}
                  required
                  value={form.CollectionDate}
                  onChange={set('CollectionDate')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t('amount') || 'Amount (₹)'} required hint={selectedLoan ? `${t('installment') || 'Inst'}: ₹${Number(selectedLoan.InstallmentAmount).toLocaleString('en-IN')}` : undefined}>
                  <TextInput
                ref={(r) => { inputRefs.current[0] = r; }}
                onFocus={() => handleFocus(0)}
                    style={INPUT}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={form.Amount}
                    onChangeText={set('Amount')}
                    keyboardType="decimal-pad"
                  />
                </Field>
              </View>
            </View>

            <Field label="Payment Mode" required>
              <View style={styles.modeGroup}>
                {MODE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.modeBtn, form.PaymentMode === opt.value && styles.modeBtnActive]}
                    onPress={() => set('PaymentMode')(opt.value)}
                  >
                    <Text style={[styles.modeBtnText, form.PaymentMode === opt.value && styles.modeBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            {needsRef && (
              <Field label="Reference / Transaction No." required>
                <TextInput
                ref={(r) => { inputRefs.current[1] = r; }}
                onFocus={() => handleFocus(1)}
                  style={INPUT}
                  placeholder={form.PaymentMode === 'Cheque' ? 'Cheque Number' : form.PaymentMode === 'UPI' ? 'UPI Transaction ID' : 'Bank Reference No.'}
                  placeholderTextColor={colors.textMuted}
                  value={form.ReferenceNo}
                  onChangeText={set('ReferenceNo')}
                />
              </Field>
            )}

            <Field label="Status">
              <View style={styles.pickerWrap}>
                <Picker selectedValue={form.Status} onValueChange={set('Status')} style={styles.picker}>
                  {STATUS_OPTIONS.map((s) => <Picker.Item key={s} label={s} value={s} />)}
                </Picker>
              </View>
            </Field>
          </View>

          {/* Notes */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
                ref={(r) => { inputRefs.current[2] = r; }}
                onFocus={() => handleFocus(2)}
              style={[INPUT, { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Add collection remarks, receipt ref..."
              placeholderTextColor={colors.textMuted}
              value={form.Notes}
              onChangeText={set('Notes')}
              multiline
            />
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: SPACING.md },
  field: { marginBottom: SPACING.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  hint: { fontSize: 11, color: colors.primary, backgroundColor: '#EEF2FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  row: { flexDirection: 'row', gap: 12 },
  pickerWrap: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.md, overflow: 'hidden',
  },
  pickerDisabled: { opacity: 0.6 },
  picker: { height: 48, color: colors.textPrimary },
  loanSummary: { backgroundColor: colors.background, borderRadius: RADIUS.md, padding: 12, marginTop: 4 },
  loanSummaryTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
  loanRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  loanKey: { fontSize: 13, color: colors.textSecondary },
  loanVal: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  modeGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  modeBtn: {
    flex: 1, minWidth: 72, paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: colors.background, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  modeBtnTextActive: { color: '#fff' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12,
  },
  dateBtnText: { fontSize: 15, color: colors.textPrimary },
});
