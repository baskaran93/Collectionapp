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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, Plus, Phone, MapPin, Edit, RefreshCw } from 'lucide-react-native';
import { useTranslation } from '../../constants/i18n';
import Avatar from '../../components/Avatar';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/api';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function PartiesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchParties = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/parties`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setParties(Array.isArray(data) ? data : []);
    } catch {
      setError(t('couldNotLoadParties'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchParties(); }, [fetchParties]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchParties();
    setRefreshing(false);
  };

  const filtered = parties.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.PartyName || '').toLowerCase().includes(q) ||
      (p.ContactPerson || '').toLowerCase().includes(q)
    );
  });

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/party/${item.Id}`)}>
      <Avatar name={item.PartyName || ''} size={48} radius={12} />
      <View style={styles.cardBody}>
        <Text style={styles.partyName}>{item.PartyName}</Text>
        {item.ContactPerson ? (
          <Text style={styles.contactPerson}>{item.ContactPerson}</Text>
        ) : null}
        <View style={styles.infoRow}>
          {item.Phone ? (
            <View style={styles.infoChip}>
              <Phone size={13} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{item.Phone}</Text>
            </View>
          ) : null}
          {item.Address ? (
            <View style={styles.infoChip}>
              <MapPin size={13} color={COLORS.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>{item.Address}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text
          style={[
            styles.balance,
            { color: (item.Balance || 0) > 0 ? COLORS.danger : COLORS.success },
          ]}
        >
          {formatCurrency(item.Balance)}
        </Text>
        <Edit size={16} color={COLORS.textMuted} style={{ marginTop: 6 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('parties')}</Text>
            <Text style={styles.subtitle}>{parties.length} {t('partiesRegistered')}</Text>
          </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/party/new')}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchNameContact')}
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <RefreshCw size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchParties}>
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
                {search ? `${t('noPartiesMatch')} "${search}"` : t('noPartiesYet')}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    gap: 8,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  refreshBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
  },
  list: { padding: SPACING.md, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardBody: { flex: 1, marginLeft: 12 },
  partyName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  contactPerson: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: COLORS.textSecondary, maxWidth: 120 },
  cardRight: { alignItems: 'flex-end', paddingLeft: 8 },
  balance: { fontSize: 14, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  errorText: { color: COLORS.danger, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
});
