import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Search, Plus, Calendar, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react-native';
import { useTranslation } from '../../constants/i18n';
import Avatar from '../../components/Avatar';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/api';

const STATUS = {
  Active:  { bg: '#DCFCE7', text: '#15803D', dot: '#22C55E' },
  Closed:  { bg: '#DBEAFE', text: '#1D4ED8', dot: '#3B82F6' },
  Overdue: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};
const PERIOD_LABEL = { day: 'Daily', week: 'Weekly', month: 'Monthly' };
const FILTERS = ['All', 'Active', 'Overdue', 'Closed'];

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

export default function LoansScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { status: statusParam } = useLocalSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTERS.includes(statusParam) ? statusParam : 'All');

  useEffect(() => {
    if (statusParam && FILTERS.includes(statusParam)) setFilter(statusParam);
  }, [statusParam]);

  const fetchLoans = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/loans`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLoans(Array.isArray(data) ? data : []);
    } catch {
      setError(t('couldNotLoadLoans'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLoans();
    }, [fetchLoans]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLoans();
    setRefreshing(false);
  };

  const filtered = loans.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = (l.PartyName || '').toLowerCase().includes(q);
    const matchFilter = filter === 'All' || l.Status === filter;
    return matchSearch && matchFilter;
  });

  const totalDisbursed = loans.reduce((s, l) => s + (parseFloat(l.LoanAmount) || 0), 0);
  const activeCount = loans.filter((l) => l.Status === 'Active').length;
  const overdueCount = loans.filter((l) => l.Status === 'Overdue').length;

  const renderItem = ({ item }) => {
    const sc = STATUS[item.Status] || STATUS.Active;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/loan/${item.Id}`)}>
        <View style={styles.cardTop}>
          <Avatar name={item.PartyName || ''} size={44} radius={12} />
          <View style={styles.cardMid}>
            <Text style={styles.partyName}>{item.PartyName || '—'}</Text>
            <Text style={styles.period}>{PERIOD_LABEL[item.InstallPeriod] || item.InstallPeriod}</Text>
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
        {item.LoanStartDate ? (
          <View style={styles.dateRow}>
            <Calendar size={13} color={COLORS.textMuted} />
            <Text style={styles.dateText}>
              {new Date(item.LoanStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {item.LoanCloseDate
                ? ` → ${new Date(item.LoanCloseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : ''}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('loans')}</Text>
          <Text style={styles.subtitle}>{loans.length} {t('totalLoans')}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/loan/new')}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statChip}>
          <TrendingUp size={14} color={COLORS.info} />
          <Text style={styles.statChipText}>{activeCount} {t('active')}</Text>
        </View>
        <View style={styles.statChip}>
          <AlertCircle size={14} color={COLORS.danger} />
          <Text style={styles.statChipText}>{overdueCount} {t('overdue')}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statChipText}>{t('total')}: {fmt(totalDisbursed)}</Text>
        </View>
      </View>

      {/* Search + Filters */}
      <View style={styles.searchArea}>
        <View style={styles.searchBox}>
          <Search size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPartyName')}
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>{
              f === 'All' ? t('all') : f === 'Active' ? t('active') : f === 'Overdue' ? t('overdue') : f === 'Closed' ? t('closed') : f
            }</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchLoans}>
            <Text style={styles.retryText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.Id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {search || filter !== 'All' ? t('noLoansMatch') : t('noLoansYet')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  statsStrip: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.background, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  statChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  searchArea: { paddingHorizontal: SPACING.md, paddingTop: 10, paddingBottom: 4, backgroundColor: COLORS.white },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: 12, gap: 8, height: 40 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  filterRow: { flexGrow: 0, height: 52, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterContent: { paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterPill: { borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: COLORS.background },
  filterPillActive: { backgroundColor: COLORS.primary },
  filterPillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterPillTextActive: { color: '#fff' },
  list: { padding: SPACING.md, gap: 10 },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardMid: { flex: 1, marginLeft: 12 },
  partyName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  period: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  statCol: { flex: 1 },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  dateText: { fontSize: 12, color: COLORS.textMuted },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, minHeight: 200 },
  errorText: { color: COLORS.danger, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
});
