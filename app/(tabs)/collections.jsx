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
import { router } from 'expo-router';
import { Search, Plus, Edit, TrendingUp, Calendar, IndianRupee } from 'lucide-react-native';
import { useTranslation } from '../../constants/i18n';
import Avatar from '../../components/Avatar';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/api';

const STATUS_STYLE = {
  Received: { bg: '#DCFCE7', text: '#15803D' },
  Pending:  { bg: '#FEF3C7', text: '#92400E' },
  Bounced:  { bg: '#FEE2E2', text: '#991B1B' },
};
const MODES = ['All', 'Cash', 'UPI', 'Bank Transfer', 'Cheque'];

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('All');

  const fetchCollections = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/collections`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCollections(Array.isArray(data) ? data : []);
    } catch {
      setError(t('couldNotLoadCollections'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCollections();
    setRefreshing(false);
  };

  const today = new Date().toDateString();
  const thisMonth = new Date();
  const todayTotal = collections.filter((c) => new Date(c.CollectionDate).toDateString() === today).reduce((s, c) => s + (c.Amount || 0), 0);
  const monthTotal = collections
    .filter((c) => { const d = new Date(c.CollectionDate); return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear(); })
    .reduce((s, c) => s + (c.Amount || 0), 0);
  const totalAll = collections.reduce((s, c) => s + (c.Amount || 0), 0);

  const filtered = collections.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = (c.PartyName || '').toLowerCase().includes(q) || (c.ReferenceNo || '').toLowerCase().includes(q);
    const matchMode = modeFilter === 'All' || c.PaymentMode === modeFilter;
    return matchSearch && matchMode;
  });

  const renderItem = ({ item }) => {
    const ss = STATUS_STYLE[item.Status] || STATUS_STYLE.Received;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/collection/${item.Id}`)}>
        <Avatar name={item.PartyName || ''} size={44} radius={12} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.partyName}>{item.PartyName || '—'}</Text>
            <Text style={styles.amount}>+{fmt(item.Amount)}</Text>
          </View>
          <View style={styles.cardBottomRow}>
            <Text style={styles.dateText}>
              {new Date(item.CollectionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <View style={styles.modeTag}>
              <Text style={styles.modeText}>{item.PaymentMode}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: ss.bg }]}>
              <Text style={[styles.badgeText, { color: ss.text }]}>{item.Status}</Text>
            </View>
          </View>
          {item.ReferenceNo ? (
            <Text style={styles.refText}>Ref: {item.ReferenceNo}</Text>
          ) : null}
        </View>
        <Edit size={16} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('collections')}</Text>
          <Text style={styles.subtitle}>{collections.length} {t('records')}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/collection/new')}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
            <IndianRupee size={16} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.statLabel}>{t('today')}</Text>
            <Text style={styles.statVal}>{fmt(todayTotal)}</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#F5F3FF' }]}>
            <Calendar size={16} color="#7C3AED" />
          </View>
          <View>
            <Text style={styles.statLabel}>{t('thisMonth')}</Text>
            <Text style={styles.statVal}>{fmt(monthTotal)}</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
            <TrendingUp size={16} color={COLORS.success} />
          </View>
          <View>
            <Text style={styles.statLabel}>{t('allTime')}</Text>
            <Text style={styles.statVal}>{fmt(totalAll)}</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchArea}>
        <View style={styles.searchBox}>
          <Search size={16} color={COLORS.textSecondary} />
            <TextInput
            style={styles.searchInput}
            placeholder={t('searchPartyReference')}
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Mode filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.filterPill, modeFilter === m && styles.filterPillActive]}
            onPress={() => setModeFilter(m)}
          >
            <Text style={[styles.filterPillText, modeFilter === m && styles.filterPillTextActive]}>{
              m === 'All' ? t('all') : m === 'Cash' ? t('cash') : m === 'UPI' ? t('upi') : m === 'Bank Transfer' ? t('bankTransfer') : m === 'Cheque' ? t('cheque') : m
            }</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchCollections}>
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
                {search || modeFilter !== 'All' ? t('noRecordsMatch') : t('noCollections')}
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
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  statVal: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  searchArea: { paddingHorizontal: SPACING.md, paddingTop: 10, paddingBottom: 4, backgroundColor: COLORS.white },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: 12, gap: 8, height: 40 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  filterRow: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterContent: { paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 8 },
  filterPill: { borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.background },
  filterPillActive: { backgroundColor: COLORS.primary },
  filterPillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterPillTextActive: { color: '#fff' },
  list: { padding: SPACING.md, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardBody: { flex: 1, marginLeft: 12 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partyName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  amount: { fontSize: 15, fontWeight: '700', color: COLORS.success },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  dateText: { fontSize: 12, color: COLORS.textSecondary },
  modeTag: { backgroundColor: COLORS.background, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 2 },
  modeText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  badge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  refText: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, minHeight: 200 },
  errorText: { color: COLORS.danger, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
});
