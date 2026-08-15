import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Calendar, LogOut, ChevronDown, ChevronUp, IndianRupee, KeyRound } from 'lucide-react-native';
import { SPACING, RADIUS, useTheme } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { getCustomerToken, getCustomerProfile, clearCustomerSession } from '../../constants/customerSession';

const STATUS = {
  Active: { bg: '#DCFCE7', text: '#15803D', dot: '#22C55E' },
  Closed: { bg: '#DBEAFE', text: '#1D4ED8', dot: '#3B82F6' },
  Overdue: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};
const PERIOD_LABEL = { day: 'Daily', week: 'Weekly', month: 'Monthly' };

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export default function CustomerLoansScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [profile, setProfile] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [collectionsByLoan, setCollectionsByLoan] = useState({});
  const [loadingCollections, setLoadingCollections] = useState(null);

  const fetchLoans = useCallback(async () => {
    try {
      setError(null);
      const token = await getCustomerToken();
      if (!token) {
        router.replace('/customer/login');
        return;
      }
      const res = await fetch(`${API_BASE}/api/customer/loans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        await clearCustomerSession();
        router.replace('/customer/login');
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLoans(Array.isArray(data) ? data : []);
    } catch {
      setError('Could not load your loans. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      getCustomerProfile().then(setProfile);
      fetchLoans();
    }, [fetchLoans]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLoans();
    setRefreshing(false);
  };

  const toggleExpand = async (loan) => {
    if (expandedId === loan.Id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(loan.Id);
    if (collectionsByLoan[loan.Id]) return;
    setLoadingCollections(loan.Id);
    try {
      const token = await getCustomerToken();
      const res = await fetch(`${API_BASE}/api/customer/loans/${loan.Id}/collections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCollectionsByLoan((prev) => ({ ...prev, [loan.Id]: Array.isArray(data) ? data : [] }));
    } catch {
      setCollectionsByLoan((prev) => ({ ...prev, [loan.Id]: [] }));
    } finally {
      setLoadingCollections(null);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await clearCustomerSession();
          router.replace('/customer/login');
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const sc = STATUS[item.Status] || STATUS.Active;
    const isExpanded = expandedId === item.Id;
    const collections = collectionsByLoan[item.Id] || [];
    const paid = collections.reduce((s, c) => s + (parseFloat(c.Amount) || 0), 0);
    const outstanding = Math.max((parseFloat(item.LoanAmount) || 0) - paid, 0);

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => toggleExpand(item)} activeOpacity={0.7}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.loanNo}>{item.LoanNo}</Text>
              <Text style={styles.period} numberOfLines={1}>
                {PERIOD_LABEL[item.InstallPeriod] || item.InstallPeriod}
                {item.LoanTypeName ? ` · ${item.LoanTypeName}` : ''}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <View style={[styles.dot, { backgroundColor: sc.dot }]} />
              <Text style={[styles.badgeText, { color: sc.text }]}>{item.Status}</Text>
            </View>
          </View>

          <View style={styles.cardStats}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Loan Amount</Text>
              <Text style={styles.statValue}>{fmt(item.LoanAmount)}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Installment</Text>
              <Text style={styles.statValue}>{fmt(item.InstallmentAmount)}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Count</Text>
              <Text style={styles.statValue}>{item.NoOfInstallments}</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <Calendar size={13} color={colors.textMuted} />
            <Text style={styles.dateText}>
              {fmtDate(item.LoanStartDate)}
              {item.LoanCloseDate ? ` → ${fmtDate(item.LoanCloseDate)}` : ''}
            </Text>
          </View>

          <View style={styles.expandRow}>
            <Text style={styles.expandText}>{isExpanded ? 'Hide payment history' : 'View payment history'}</Text>
            {isExpanded ? (
              <ChevronUp size={16} color={colors.primary} />
            ) : (
              <ChevronDown size={16} color={colors.primary} />
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.historyWrap}>
            {loadingCollections === item.Id ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: SPACING.md }} />
            ) : collections.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No payments recorded yet.</Text>
            ) : (
              <>
                <View style={styles.historySummary}>
                  <Text style={styles.historySummaryText}>Paid: {fmt(paid)}</Text>
                  <Text style={styles.historySummaryText}>Outstanding: {fmt(outstanding)}</Text>
                </View>
                {collections.map((c) => (
                  <View key={c.Id} style={styles.paymentRow}>
                    <IndianRupee size={14} color={colors.textSecondary} />
                    <Text style={styles.paymentDate}>{fmtDate(c.CollectionDate)}</Text>
                    <Text style={styles.paymentMode}>{c.PaymentMode}</Text>
                    <Text style={styles.paymentAmount}>{fmt(c.Amount)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{profile?.PartyName || 'My Loans'}</Text>
          <Text style={styles.subtitle}>{loans.length} loan{loans.length === 1 ? '' : 's'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/customer/change-pin')}>
            <KeyRound size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.dangerBg }]} onPress={handleLogout}>
            <LogOut size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchLoans}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => String(item.Id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No loans found on your account.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  list: { padding: SPACING.md, gap: 10 },
  card: {
    backgroundColor: colors.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  loanNo: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  period: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  statCol: { flex: 1 },
  statLabel: { fontSize: 11, color: colors.textMuted },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  dateText: { fontSize: 12, color: colors.textMuted },
  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  expandText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  historyWrap: { marginTop: 10 },
  emptyHistoryText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: SPACING.sm },
  historySummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  historySummaryText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  paymentDate: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  paymentMode: { fontSize: 11, color: colors.textMuted, backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  paymentAmount: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, minHeight: 200 },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
