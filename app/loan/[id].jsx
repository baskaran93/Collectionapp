import React, { useState, useEffect, useRef, useMemo } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { CalendarDays } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenHeader from '../../components/ScreenHeader';
import { SPACING, RADIUS, useTheme } from '../../constants/theme';
import { API_BASE } from '../../constants/api';

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];
const STATUS_OPTIONS = ['Active', 'Closed', 'Overdue'];
const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];
const MONTH_DATE_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

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

function DateField({ label, required, hint, value, onChange, disabled }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [show, setShow] = useState(false);
  const date = value ? new Date(value) : new Date();
  const display = value || 'Select date';

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TouchableOpacity
        style={[styles.dateBtn, disabled && styles.dateBtnDisabled]}
        onPress={() => !disabled && setShow(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.dateBtnText, !value && { color: colors.textMuted }]}>{display}</Text>
        <CalendarDays size={16} color={disabled ? colors.textMuted : colors.primary} />
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

export default function LoanDetailScreen() {
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const inputRefs = useRef([]);
  const focusedIndexRef = useRef(null);

  const adjustScrollForFocusedField = () => {
    const idx = focusedIndexRef.current;
    const node = idx != null ? inputRefs.current[idx] : null;
    const scroller = scrollRef.current;
    if (!node || !scroller || !node.measure || !scroller.measure) {
      return;
    }
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

  const { id } = useLocalSearchParams();
  const isNew = !id || id === 'new';

  const [parties, setParties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    PartyId: '',
    LoanAmount: '',
    LoanStartDate: '',
    NoOfInstallments: '',
    InstallmentAmount: '',
    InstallPeriod: 'month',
    InstallmentDate: '',
    LoanCloseDate: '',
    Status: 'Active',
    Notes: '',
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/parties`)
      .then((r) => r.json())
      .then((d) => setParties(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isNew) {
      fetch(`${API_BASE}/api/loans/${id}`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((d) => setForm({
          PartyId: String(d.PartyId || ''),
          LoanAmount: String(d.LoanAmount || ''),
          LoanStartDate: d.LoanStartDate || '',
          NoOfInstallments: String(d.NoOfInstallments || ''),
          InstallmentAmount: String(d.InstallmentAmount || ''),
          InstallPeriod: d.InstallPeriod || 'month',
          InstallmentDate: d.InstallmentDate != null ? String(d.InstallmentDate) : '',
          LoanCloseDate: d.LoanCloseDate || '',
          Status: d.Status || 'Active',
          Notes: d.Notes || '',
        }))
        .catch(() => { Alert.alert('Error', 'Could not load loan.'); router.back(); });
    }
  }, [id, isNew]);

  // Auto-calc installment amount
  useEffect(() => {
    const amt = parseFloat(form.LoanAmount);
    const n = parseInt(form.NoOfInstallments);
    if (amt > 0 && n > 0) {
      setForm((p) => ({ ...p, InstallmentAmount: (amt / n).toFixed(2) }));
    }
  }, [form.LoanAmount, form.NoOfInstallments]);

  // Auto-calc close date
  useEffect(() => {
    const start = form.LoanStartDate;
    const n = parseInt(form.NoOfInstallments);
    const period = form.InstallPeriod;
    if (start && n > 0) {
      const d = new Date(start);
      if (period === 'day') d.setDate(d.getDate() + n);
      else if (period === 'week') d.setDate(d.getDate() + n * 7);
      else d.setMonth(d.getMonth() + n);
      setForm((p) => ({ ...p, LoanCloseDate: d.toISOString().split('T')[0] }));
    }
  }, [form.LoanStartDate, form.NoOfInstallments, form.InstallPeriod]);

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.PartyId) { Alert.alert('Validation', 'Please select a party.'); return; }
    if (!form.LoanAmount) { Alert.alert('Validation', 'Loan amount is required.'); return; }
    if (!form.LoanStartDate) { Alert.alert('Validation', 'Start date is required.'); return; }
    if (!form.NoOfInstallments) { Alert.alert('Validation', 'Number of installments is required.'); return; }
    if (hasInstallmentMismatch) {
      Alert.alert(
        'Amount Mismatch',
        `Installments total ₹${installmentTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}, but the loan amount is ₹${totalAmount.toLocaleString('en-IN')}. Save anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Anyway', onPress: () => saveLoan() },
        ],
      );
      return;
    }
    await saveLoan();
  };

  const saveLoan = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        PartyId: parseInt(form.PartyId),
        LoanAmount: parseFloat(form.LoanAmount),
        NoOfInstallments: parseInt(form.NoOfInstallments),
        InstallmentAmount: parseFloat(form.InstallmentAmount),
        InstallmentDate: form.InstallmentDate !== '' ? parseInt(form.InstallmentDate) : null,
        LoanCloseDate: form.LoanCloseDate || null,
      };
      const url = isNew ? `${API_BASE}/api/loans` : `${API_BASE}/api/loans/${id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Failed'); }
      router.back();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save loan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Loan', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const res = await fetch(`${API_BASE}/api/loans/${id}`, { method: 'DELETE' });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.detail || 'Failed to delete loan.');
            }
            router.replace('/(tabs)/loans');
          } catch (e) {
            Alert.alert('Unable to Delete Loan', e.message || 'Failed to delete loan.');
            setSaving(false);
          }
        },
      },
    ]);
  };

  const totalAmount = parseFloat(form.LoanAmount) || 0;
  const installAmt = parseFloat(form.InstallmentAmount) || 0;
  const noOfInst = parseInt(form.NoOfInstallments) || 0;
  const installmentTotal = installAmt * noOfInst;
  const hasInstallmentMismatch = noOfInst > 0 && totalAmount > 0 && Math.abs(installmentTotal - totalAmount) > 1;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.root}>
        <ScreenHeader
          title={isNew ? 'New Loan' : 'Edit Loan'}
          saving={saving}
          showDelete={!isNew}
          onDelete={handleDelete}
          onSave={handleSave}
          saveLabel="Save Loan"
        />

        <ScrollView ref={scrollRef} onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Summary strip */}
          {totalAmount > 0 && (
            <View style={styles.summaryStrip}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Loan</Text>
                <Text style={styles.summaryValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Installment</Text>
                <Text style={styles.summaryValue}>₹{installAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={[styles.summaryValue, hasInstallmentMismatch && { color: colors.warning }]}>
                  ₹{installmentTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          )}
          {hasInstallmentMismatch && (
            <Text style={styles.mismatchWarning}>
              ⚠ Installments total ₹{installmentTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}, which doesn't match the loan amount of ₹{totalAmount.toLocaleString('en-IN')}.
            </Text>
          )}

          {/* Party & Loan */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Party & Loan Details</Text>

            <Field label="Party Name" required>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={form.PartyId}
                  onValueChange={set('PartyId')}
                  style={styles.picker}
                >
                  <Picker.Item label="— Select a Party —" value="" />
                  {parties.map((p) => (
                    <Picker.Item key={p.Id} label={p.PartyName} value={String(p.Id)} />
                  ))}
                </Picker>
              </View>
            </Field>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Loan Amount (₹)" required>
                  <TextInput
                ref={(r) => { inputRefs.current[0] = r; }}
                onFocus={() => handleFocus(0)}
                    style={INPUT}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={form.LoanAmount}
                    onChangeText={set('LoanAmount')}
                    keyboardType="decimal-pad"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Status">
                  <View style={styles.pickerWrap}>
                    <Picker selectedValue={form.Status} onValueChange={set('Status')} style={styles.picker}>
                      {STATUS_OPTIONS.map((s) => <Picker.Item key={s} label={s} value={s} />)}
                    </Picker>
                  </View>
                </Field>
              </View>
            </View>
          </View>

          {/* Dates */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Loan Dates</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <DateField
                  label="Start Date"
                  required
                  value={form.LoanStartDate}
                  onChange={set('LoanStartDate')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateField
                  label="Close Date"
                  hint="auto"
                  value={form.LoanCloseDate}
                  onChange={set('LoanCloseDate')}
                />
              </View>
            </View>
          </View>

          {/* Installment Schedule */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Installment Schedule</Text>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="No. of Installments" required>
                  <TextInput
                ref={(r) => { inputRefs.current[1] = r; }}
                onFocus={() => handleFocus(1)}
                    style={INPUT}
                    placeholder="e.g. 12"
                    placeholderTextColor={colors.textMuted}
                    value={form.NoOfInstallments}
                    onChangeText={set('NoOfInstallments')}
                    keyboardType="number-pad"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Inst. Amount (₹)" hint="auto">
                  <TextInput
                ref={(r) => { inputRefs.current[2] = r; }}
                onFocus={() => handleFocus(2)}
                    style={INPUT}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={form.InstallmentAmount}
                    onChangeText={set('InstallmentAmount')}
                    keyboardType="decimal-pad"
                  />
                </Field>
              </View>
            </View>

            <Field label="Install Period" required>
              <View style={styles.periodGroup}>
                {PERIOD_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.periodBtn, form.InstallPeriod === opt.value && styles.periodBtnActive]}
                    onPress={() => setForm((p) => ({ ...p, InstallPeriod: opt.value, InstallmentDate: '' }))}
                  >
                    <Text style={[styles.periodBtnText, form.InstallPeriod === opt.value && styles.periodBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            {form.InstallPeriod === 'week' && (
              <Field label="Collection Day" hint="Which day of the week">
                <View style={styles.dayOffsetGroup}>
                  {WEEKDAY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.dayChip, Number(form.InstallmentDate) === opt.value && styles.dayChipActive]}
                      onPress={() => set('InstallmentDate')(String(opt.value))}
                    >
                      <Text style={[styles.dayChipText, Number(form.InstallmentDate) === opt.value && styles.dayChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>
            )}

            {form.InstallPeriod === 'month' && (
              <Field label="Collection Date" hint="Which date of the month">
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={form.InstallmentDate}
                    onValueChange={set('InstallmentDate')}
                    style={styles.picker}
                  >
                    <Picker.Item label="— Select a date —" value="" />
                    {MONTH_DATE_OPTIONS.map((d) => (
                      <Picker.Item key={d} label={String(d)} value={String(d)} />
                    ))}
                  </Picker>
                </View>
              </Field>
            )}
          </View>

          {/* Notes */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
                ref={(r) => { inputRefs.current[4] = r; }}
                onFocus={() => handleFocus(4)}
              style={[INPUT, { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Any remarks about this loan…"
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
  summaryStrip: {
    flexDirection: 'row', backgroundColor: colors.primary, borderRadius: RADIUS.lg, padding: SPACING.md, gap: 8,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 2 },
  mismatchWarning: { fontSize: 12, color: colors.warning, fontWeight: '600' },
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
  picker: { height: 48, color: colors.textPrimary },
  periodGroup: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: colors.background, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  periodBtnTextActive: { color: '#fff' },
  dayOffsetGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: RADIUS.full,
    backgroundColor: colors.background, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  dayChipTextActive: { color: '#fff' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12,
  },
  dateBtnDisabled: { opacity: 0.6 },
  dateBtnText: { fontSize: 15, color: colors.textPrimary },
});
