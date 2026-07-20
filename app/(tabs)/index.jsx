import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LogOut, UserPlus, FileText, Wallet, TrendingUp, Settings } from 'lucide-react-native';
import { useTranslation } from '../../constants/i18n';
import Avatar, { getAvatarColor } from '../../components/Avatar';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/api';

const { width } = Dimensions.get('window');

const PERIOD_LABEL = { day: 'Daily', week: 'Weekly', month: 'Monthly' };

function formatAmount(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [collections, setCollections] = useState([]);
  const [loans, setLoans] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (loggingOut) router.replace('/');
  }, [loggingOut]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => setLoggingOut(true) },
    ]);
  };

  const fetchData = useCallback(async () => {
    try {
      const [colRes, loanRes] = await Promise.all([
        fetch(`${API_BASE}/api/collections`),
        fetch(`${API_BASE}/api/loans`),
      ]);
      const colData = await colRes.json();
      const loanData = await loanRes.json();
      setCollections(Array.isArray(colData) ? colData : []);
      setLoans(Array.isArray(loanData) ? loanData : []);
    } catch {
      // silent fail — show empty state
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Derived stats
  const todayStr = new Date().toDateString();
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toDateString(); })();

  const todayCols = collections.filter((c) => new Date(c.CollectionDate).toDateString() === todayStr);
  const todayTotal = todayCols.reduce((s, c) => s + (c.Amount || 0), 0);
  const yesterdayTotal = collections
    .filter((c) => new Date(c.CollectionDate).toDateString() === yesterdayStr)
    .reduce((s, c) => s + (c.Amount || 0), 0);
  const pctChange = yesterdayTotal > 0 ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100) : 0;

  const activeLoans = loans.filter((l) => l.Status === 'Active' || l.Status === 'Overdue');
  const dueTodayAmount = activeLoans.reduce((s, l) => s + (parseFloat(l.InstallmentAmount) || 0), 0);
  const outstandingTotal = loans.filter((l) => l.Status !== 'Closed').reduce((s, l) => s + (parseFloat(l.LoanAmount) || 0), 0);
  const overdueCount = loans.filter((l) => l.Status === 'Overdue').length;

  // Collection count map per loan for installment display
  const collectionCountByLoan = collections.reduce((acc, c) => {
    if (c.LoanId) acc[c.LoanId] = (acc[c.LoanId] || 0) + 1;
    return acc;
  }, {});

  const collectedTodayLoanIds = new Set(todayCols.map((c) => c.LoanId));
  const dueItems = activeLoans
    .filter((l) => !collectedTodayLoanIds.has(l.Id))
    .slice(0, 3);
  const recentCols = [...collections]
    .sort((a, b) => new Date(b.CollectionDate) - new Date(a.CollectionDate))
    .slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="rgba(255,255,255,0.8)"
            progressViewOffset={insets.top + 10}
          />
        }
      >
        {/* ── Purple Header ── */}
        <LinearGradient
          colors={['#6366F1', '#4F46E5', '#4338CA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          {/* Decorative blobs — pointerEvents none so they never block touches */}
          <View style={styles.blob1} pointerEvents="none" />
          <View style={styles.blob2} pointerEvents="none" />

          {/* Top row */}
          <View style={styles.headerRow}>
            <View style={styles.userRow}>
              <View style={styles.userAvatarCircle}>
                <Text style={styles.userAvatarText}>A</Text>
              </View>
              <View>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.userName}>Admin</Text>
              </View>
            </View>
            <View style={styles.iconRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')}>
                <Settings size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
                <LogOut size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Collected amount */}
          <Text style={styles.collectedLabel}>{t('todaysCollected')}</Text>
          <Text style={styles.collectedAmount}>
            ₹{Math.round(todayTotal).toLocaleString('en-IN')}
          </Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {pctChange >= 0 ? '↑' : '↓'}{Math.abs(pctChange)}% {t('vsYesterday')}
              </Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{todayCols.length} {t('collectionsLabel')}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Body ── */}
        <View style={styles.body}>

          {/* Metrics Row */}
          <View style={styles.metricsCard}>
            <View style={styles.metricHalf}>
              <Text style={styles.metricLabel}>{t('dueTodayLabel')}</Text>
              <Text style={styles.metricValue}>₹{Math.round(dueTodayAmount).toLocaleString('en-IN')}</Text>
              <Text style={[styles.metricSub, { color: COLORS.warning }]}>
                {activeLoans.length} {t('activeParties')}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricHalf}>
              <Text style={styles.metricLabel}>{t('outstandingLabel')}</Text>
              <Text style={styles.metricValue}>{formatAmount(outstandingTotal)}</Text>
              <Text style={[styles.metricSub, { color: COLORS.danger }]}>\
                {overdueCount} {t('overdue')}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/party/new')}>
              <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                <UserPlus size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.actionLabel}>{t('newParty')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/loan/new')}>
              <View style={[styles.actionIcon, { backgroundColor: '#F5F3FF' }]}> 
                <FileText size={22} color="#7C3AED" />
              </View>
              <Text style={styles.actionLabel}>{t('newLoan')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/collection/new')}>
              <View style={[styles.actionIcon, { backgroundColor: '#FFFBEB' }]}> 
                <Wallet size={22} color="#D97706" />
              </View>
              <Text style={styles.actionLabel}>{t('collect')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.reportsLink} onPress={() => router.push('/reports')}>
            <View style={styles.reportIcon}>
              <TrendingUp size={20} color="#7C3AED" />
            </View>
            <View style={styles.reportTextArea}>
              <Text style={styles.reportTitle}>{t('reports')}</Text>
              <Text style={styles.reportSubtitle}>{t('reportsSubtitle')}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('dueToday')}</Text>
              <TouchableOpacity onPress={() => router.push('/loans')}>
                <Text style={styles.seeAll}>{t('seeAll')}</Text>
              </TouchableOpacity>
            </View>

            {dueItems.length === 0 ? (
              <Text style={styles.emptyText}>{t('noActiveLoans')}</Text>
            ) : (
              dueItems.map((loan, i) => {
                const done = collectionCountByLoan[loan.Id] || 0;
                const total = loan.NoOfInstallments || 0;
                const { text: borderColor } = getAvatarColor(loan.PartyName || '');
                const isOverdue = loan.Status === 'Overdue';
                return (
                  <TouchableOpacity
                    key={loan.Id || i}
                    style={[styles.dueCard, { borderLeftColor: borderColor }]}
                    onPress={() => router.push(`/collection/new?loanId=${loan.Id}&partyId=${loan.PartyId}`)}
                  >
                    <Avatar name={loan.PartyName || 'U'} size={44} radius={12} />
                    <View style={styles.dueCardMid}>
                      <Text style={styles.dueCardName}>{loan.PartyName || 'Unknown'}</Text>
                      <Text style={styles.dueCardSub}>
                        {isOverdue
                          ? t('overdueStatus')
                          : total > 0
                          ? `${t('installment')} ${done + 1} of ${total}`
                          : PERIOD_LABEL[loan.InstallPeriod] || t('installment')}
                      </Text>
                    </View>
                    <View style={styles.dueCardRight}>
                      <Text style={styles.dueAmount}>
                        ₹{parseFloat(loan.InstallmentAmount || 0).toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.collectLink}>{t('collectAction')}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Recent Collections */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('recentCollections')}</Text>
              <TouchableOpacity onPress={() => router.push('/collections')}>
                <Text style={styles.seeAll}>{t('seeAll')}</Text>
              </TouchableOpacity>
            </View>

            {recentCols.length === 0 ? (
              <Text style={styles.emptyText}>{t('noRecentCollections')}</Text>
            ) : (
              recentCols.map((col, i) => (
                <View key={col.Id || i} style={styles.recentCard}>
                  <Avatar name={col.PartyName || 'U'} size={44} radius={12} />
                  <View style={styles.recentMid}>
                    <Text style={styles.dueCardName}>{col.PartyName || 'Unknown'}</Text>
                    <Text style={styles.dueCardSub}>
                      {new Date(col.CollectionDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.recentAmount}>+₹{(col.Amount || 0).toLocaleString('en-IN')}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingHorizontal: SPACING.lg, paddingBottom: 28, overflow: 'hidden' },
  blob1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)', right: -40, top: -40,
  },
  blob2: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.06)', right: 70, top: 30,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.xl,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  userAvatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { color: '#fff', fontWeight: '700', fontSize: 19 },
  greeting: { color: 'rgba(255,255,255,0.78)', fontSize: 13 },
  userName: { color: '#fff', fontWeight: '800', fontSize: 19 },
  iconRow: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  collectedLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 14, marginBottom: 4 },
  collectedAmount: { color: '#fff', fontSize: 46, fontWeight: '800', letterSpacing: -1 },
  pillRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Body
  body: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: 32 },

  // Metrics
  metricsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  metricHalf: { flex: 1, padding: SPACING.md },
  metricDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  metricLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5 },
  metricValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  metricSub: { fontSize: 13, marginTop: 2, fontWeight: '600' },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: SPACING.md },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  reportsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  reportTextArea: { flex: 1 },
  reportTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  reportSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  // Sections
  section: { marginBottom: SPACING.lg },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  seeAll: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', padding: SPACING.lg, fontSize: 14 },

  // Due Today cards
  dueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dueCardMid: { flex: 1, marginLeft: 12 },
  dueCardName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  dueCardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  dueCardRight: { alignItems: 'flex-end' },
  dueAmount: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  collectLink: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 3 },

  // Recent Collections
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recentMid: { flex: 1, marginLeft: 12 },
  recentAmount: { fontSize: 16, fontWeight: '700', color: COLORS.success },
});
