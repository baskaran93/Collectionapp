import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { CalendarDays } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenHeader from '../../components/ScreenHeader';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/api';

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];
const STATUS_OPTIONS = ['Active', 'Closed', 'Overdue'];

const INPUT = {
  backgroundColor: COLORS.background,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: RADIUS.md,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: COLORS.textPrimary,
};

function Field({ label, required, hint, children }) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={{ color: COLORS.danger }}> *</Text> : null}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function DateField({ label, required, hint, value, onChange, disabled }) {
  const [show, setShow] = useState(false);
  const date = value ? new Date(value) : new Date();
  const display = value || 'Select date';

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={{ color: COLORS.danger }}> *</Text> : null}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TouchableOpacity
        style={[styles.dateBtn, disabled && styles.dateBtnDisabled]}
        onPress={() => !disabled && setShow(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.dateBtnText, !value && { color: COLORS.textMuted }]}>{display}</Text>
        <CalendarDays size={16} color={disabled ? COLORS.textMuted : COLORS.primary} />
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
            await fetch(`${API_BASE}/api/loans/${id}`, { method: 'DELETE' });
            router.replace('/(tabs)/loans');
          } catch {
            Alert.alert('Error', 'Failed to delete loan.');
            setSaving(false);
          }
        },
      },
    ]);
  };

  const totalAmount = parseFloat(form.LoanAmount) || 0;
  const installAmt = parseFloat(form.InstallmentAmount) || 0;
  const noOfInst = parseInt(form.NoOfInstallments) || 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.root}>
        <ScreenHeader
          title={isNew ? 'New Loan' : 'Edit Loan'}
          saving={saving}
          showDelete={!isNew}
          onDelete={handleDelete}
          onSave={handleSave}
          saveLabel="Save Loan"
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.summaryValue}>₹{(installAmt * noOfInst).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
              </View>
            </View>
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
                    style={INPUT}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textMuted}
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
                    style={INPUT}
                    placeholder="e.g. 12"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.NoOfInstallments}
                    onChangeText={set('NoOfInstallments')}
                    keyboardType="number-pad"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Inst. Amount (₹)" hint="auto">
                  <TextInput
                    style={INPUT}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textMuted}
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
                    onPress={() => set('InstallPeriod')(opt.value)}
                  >
                    <Text style={[styles.periodBtnText, form.InstallPeriod === opt.value && styles.periodBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <Field label={`Day offset (${form.InstallPeriod === 'month' ? '1–31' : form.InstallPeriod === 'week' ? '1–7' : 'offset'})`}>
              <TextInput
                style={INPUT}
                placeholder={form.InstallPeriod === 'month' ? '1 – 31' : '1 – 7'}
                placeholderTextColor={COLORS.textMuted}
                value={form.InstallmentDate}
                onChangeText={set('InstallmentDate')}
                keyboardType="number-pad"
              />
            </Field>
          </View>

          {/* Notes */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={[INPUT, { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Any remarks about this loan…"
              placeholderTextColor={COLORS.textMuted}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  summaryStrip: {
    flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.md, gap: 8,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 2 },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  field: { marginBottom: SPACING.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  hint: { fontSize: 11, color: COLORS.primary, backgroundColor: '#EEF2FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  row: { flexDirection: 'row', gap: 12 },
  pickerWrap: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, overflow: 'hidden',
  },
  picker: { height: 48, color: COLORS.textPrimary },
  periodGroup: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: COLORS.background, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  periodBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  periodBtnTextActive: { color: '#fff' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12,
  },
  dateBtnDisabled: { opacity: 0.6 },
  dateBtnText: { fontSize: 15, color: COLORS.textPrimary },
});
