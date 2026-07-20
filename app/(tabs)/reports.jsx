import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Layers, Clock3, Download, TrendingUp } from 'lucide-react-native';
import { useTranslation } from '../../constants/i18n';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

const REPORT_KEYS = [
  'collectionSummary',
  'outstanding',
  'paymentHistory',
  'customerLedger',
];

const iconMap = {
  collectionSummary: FileText,
  outstanding: TrendingUp,
  paymentHistory: Clock3,
  customerLedger: Layers,
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [collections, setCollections] = useState([]);
  const [loans, setLoans] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedReport, setSelectedReport] = useState(REPORT_KEYS[0]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [colRes, loanRes, partyRes] = await Promise.all([
        fetch(`${API_BASE}/api/collections`),
        fetch(`${API_BASE}/api/loans`),
        fetch(`${API_BASE}/api/parties`),
      ]);
      const [colData, loanData, partyData] = await Promise.all([
        colRes.json(),
        loanRes.json(),
        partyRes.json(),
      ]);
      setCollections(Array.isArray(colData) ? colData : []);
      setLoans(Array.isArray(loanData) ? loanData : []);
      setParties(Array.isArray(partyData) ? partyData : []);
    } catch (error) {
      Alert.alert(t('reportErrorTitle'), t('reportErrorMsg'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [partyQuery, setPartyQuery] = useState('');

  const partyOptions = useMemo(
    () => Array.from(new Set(parties.map((p) => p.PartyName).filter(Boolean))).slice(0, 8),
    [parties],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const matchParty = useCallback(
    (name) => {
      if (!partyQuery.trim()) return true;
      return (name || '').toLowerCase().includes(partyQuery.trim().toLowerCase());
    },
    [partyQuery],
  );

  const filteredCollections = useMemo(
    () => collections.filter((item) => matchParty(item.PartyName)),
    [collections, matchParty],
  );

  const filteredLoans = useMemo(
    () => loans.filter((loan) => matchParty(loan.PartyName)),
    [loans, matchParty],
  );

  const filteredOutstandingLoans = useMemo(
    () => filteredLoans.filter((loan) => loan.Status !== 'Closed'),
    [filteredLoans],
  );

  const filteredOverdueLoans = useMemo(
    () => filteredOutstandingLoans.filter((loan) => loan.Status === 'Overdue'),
    [filteredOutstandingLoans],
  );

  const today = useMemo(() => new Date().toDateString(), []);
  const monthRef = useMemo(() => new Date(), []);

  const collectionSummary = useMemo(() => {
    const todayTotal = filteredCollections
      .filter((item) => new Date(item.CollectionDate).toDateString() === today)
      .reduce((sum, item) => sum + safeNumber(item.Amount), 0);
    const monthTotal = filteredCollections
      .filter((item) => {
        const date = new Date(item.CollectionDate);
        return date.getMonth() === monthRef.getMonth() && date.getFullYear() === monthRef.getFullYear();
      })
      .reduce((sum, item) => sum + safeNumber(item.Amount), 0);
    const allTotal = filteredCollections.reduce((sum, item) => sum + safeNumber(item.Amount), 0);
    return { todayTotal, monthTotal, allTotal, count: filteredCollections.length };
  }, [filteredCollections, today, monthRef]);

  const outstandingLoans = filteredOutstandingLoans;
  const overdueLoans = filteredOverdueLoans;

  const ledgerRows = useMemo(() => {
    const loanTotals = loans.reduce((acc, loan) => {
      const partyId = loan.PartyId || loan.PartyId === 0 ? String(loan.PartyId) : 'unknown';
      acc[partyId] = (acc[partyId] || 0) + safeNumber(loan.LoanAmount);
      return acc;
    }, {});
    const collectionsTotals = collections.reduce((acc, col) => {
      const partyId = col.PartyId || col.PartyId === 0 ? String(col.PartyId) : 'unknown';
      acc[partyId] = (acc[partyId] || 0) + safeNumber(col.Amount);
      return acc;
    }, {});

    return parties.map((party) => {
      const partyId = party.Id || 'unknown';
      const openingBalance = safeNumber(party.OpeningBalance || party.OpenBalance || 0);
      const adjustments = safeNumber(party.Adjustments || party.Adjustment || 0);
      const loanTotal = safeNumber(loanTotals[String(partyId)]);
      const collected = safeNumber(collectionsTotals[String(partyId)]);
      const closingBalance = openingBalance + loanTotal - collected + adjustments;
      return {
        id: partyId,
        name: party.PartyName || 'Unknown',
        openingBalance,
        loanTotal,
        collected,
        adjustments,
        closingBalance,
      };
    });
  }, [parties, loans, collections]);

  const recentPayments = useMemo(
    () => [...collections]
      .sort((a, b) => new Date(b.CollectionDate) - new Date(a.CollectionDate))
      .slice(0, 12),
    [collections],
  );

  const filteredRecentPayments = useMemo(
    () => recentPayments.filter((item) => matchParty(item.PartyName)),
    [recentPayments, matchParty],
  );

  const filteredLedgerRows = useMemo(
    () => ledgerRows.filter((row) => matchParty(row.name)),
    [ledgerRows, matchParty],
  );

  const createCsv = useCallback((report) => {
    const clean = (value) => {
      const text = value == null ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    let rows = [];
    let header = [];

    if (report === 'collectionSummary') {
      header = [t('period'), t('amount'), t('count')];
      rows = [
        [t('today'), collectionSummary.todayTotal, filteredCollections.filter((item) => new Date(item.CollectionDate).toDateString() === today).length],
        [t('thisMonth'), collectionSummary.monthTotal, filteredCollections.filter((item) => {
          const date = new Date(item.CollectionDate);
          return date.getMonth() === monthRef.getMonth() && date.getFullYear() === monthRef.getFullYear();
        }).length],
        [t('allTime'), collectionSummary.allTotal, collectionSummary.count],
      ];
    } else if (report === 'outstanding') {
      header = [t('loanId'), t('party'), t('status'), t('loanAmount'), t('installment')];
      rows = outstandingLoans.map((loan) => [loan.Id, loan.PartyName, loan.Status, formatCurrency(loan.LoanAmount), formatCurrency(loan.InstallmentAmount)]);
    } else if (report === 'paymentHistory') {
      header = [t('date'), t('party'), t('amount'), t('mode'), t('reference')];
      rows = filteredRecentPayments.map((item) => [
        new Date(item.CollectionDate).toLocaleDateString('en-IN'),
        item.PartyName,
        formatCurrency(item.Amount),
        item.PaymentMode || 'N/A',
        item.ReferenceNo || '',
      ]);
    } else {
      header = [t('party'), t('openingBalance'), t('loanTotal'), t('collected'), t('adjustments'), t('closingBalance')];
      rows = filteredLedgerRows.map((row) => [
        row.name,
        formatCurrency(row.openingBalance),
        formatCurrency(row.loanTotal),
        formatCurrency(row.collected),
        formatCurrency(row.adjustments),
        formatCurrency(row.closingBalance),
      ]);
    }

    return [header, ...rows].map((row) => row.map(clean).join(',')).join('\n');
  }, [collectionSummary, collections, outstandingLoans, recentPayments, ledgerRows, today, monthRef]);

  const createHtml = useCallback((report) => {
    const toRows = (items) => items.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('');
    let title = report;
    let rows = [];
    let headers = [];

    if (report === 'Collection Summary') {
      headers = ['Period', 'Amount', 'Count'];
      rows = [
        ['Today', formatCurrency(collectionSummary.todayTotal), filteredCollections.filter((item) => new Date(item.CollectionDate).toDateString() === today).length],
        ['This Month', formatCurrency(collectionSummary.monthTotal), filteredCollections.filter((item) => {
          const date = new Date(item.CollectionDate);
          return date.getMonth() === monthRef.getMonth() && date.getFullYear() === monthRef.getFullYear();
        }).length],
        ['Total', formatCurrency(collectionSummary.allTotal), collectionSummary.count],
      ];
    } else if (report === 'Outstanding') {
      headers = ['Loan ID', 'Party', 'Status', 'Loan Amount', 'Installment'];
      rows = outstandingLoans.map((loan) => [loan.Id, loan.PartyName || 'Unknown', loan.Status, formatCurrency(loan.LoanAmount), formatCurrency(loan.InstallmentAmount)]);
    } else if (report === 'Payment History') {
      headers = ['Date', 'Party', 'Amount', 'Mode', 'Reference'];
      rows = filteredRecentPayments.map((item) => [
        new Date(item.CollectionDate).toLocaleDateString('en-IN'),
        item.PartyName || 'Unknown',
        formatCurrency(item.Amount),
        item.PaymentMode || 'N/A',
        item.ReferenceNo || '',
      ]);
    } else {
      headers = ['Party', 'Opening Balance', 'Loan Total', 'Collected', 'Adjustments', 'Closing Balance'];
      rows = filteredLedgerRows.map((row) => [
        row.name,
        formatCurrency(row.openingBalance),
        formatCurrency(row.loanTotal),
        formatCurrency(row.collected),
        formatCurrency(row.adjustments),
        formatCurrency(row.closingBalance),
      ]);
    }

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; }
            h1 { color: #4338CA; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
            th { background: #EEF2FF; }
            tr:nth-child(even) { background: #F8FAFC; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${toRows(rows)}</tbody>
          </table>
        </body>
      </html>
    `;
  }, [collectionSummary, collections, outstandingLoans, recentPayments, ledgerRows, today, monthRef]);

  const shareFile = useCallback(async (uri, mimeType, title) => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing not available', 'Your device does not support sharing files from this app.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType, dialogTitle: title });
    } catch (error) {
      Alert.alert('Share Error', 'Unable to share the generated file.');
    }
  }, []);

  const onExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const csv = createCsv(selectedReport);
      const filename = `collectionapp-${selectedReport.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`;
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await shareFile(uri, 'text/csv', `${selectedReport} export`);
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to create CSV export.');
    } finally {
      setExporting(false);
    }
  }, [createCsv, selectedReport, shareFile]);

  const onExportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const html = createHtml(selectedReport);
      const { uri } = await Print.printToFileAsync({ html });
      await shareFile(uri, 'application/pdf', `${selectedReport} export`);
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to create PDF export.');
    } finally {
      setExporting(false);
    }
  }, [createHtml, selectedReport, shareFile]);

  const activeReport = selectedReport;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>      
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <View style={styles.statsRight}>
          <TouchableOpacity style={styles.exportButton} onPress={onExportCsv} disabled={exporting || loading}>
            <FileText size={18} color="#fff" />
            <Text style={styles.exportLabel}>Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton} onPress={onExportPdf} disabled={exporting || loading}>
            <Download size={18} color="#fff" />
            <Text style={styles.exportLabel}>PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick report overview</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Collections today</Text>
              <Text style={styles.summaryValue}>{formatCurrency(collectionSummary.todayTotal)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Outstanding</Text>
              <Text style={styles.summaryValue}>{formatCurrency(filteredOutstandingLoans.reduce((sum, loan) => sum + safeNumber(loan.LoanAmount), 0))}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Overdue loans</Text>
              <Text style={styles.summaryValue}>{filteredOverdueLoans.length}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Ledger parties</Text>
              <Text style={styles.summaryValue}>{filteredLedgerRows.length}</Text>
            </View>
          </View>
        </View>

    
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search party name..."
            placeholderTextColor={COLORS.textMuted}
            value={partyQuery}
            onChangeText={setPartyQuery}
            returnKeyType="search"
          />
          {partyOptions.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !partyQuery.trim() && styles.chipActive]}
                onPress={() => setPartyQuery('')}
              >
                <Text style={[styles.chipText, !partyQuery.trim() && styles.chipTextActive]}>All</Text>
              </TouchableOpacity>
              {partyOptions.map((name) => {
                const active = partyQuery.trim().toLowerCase() === name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setPartyQuery(name)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.reportContent}>
            {activeReport === 'Collection Summary' && (
              <View style={styles.reportBox}>
                <Text style={styles.reportHeading}>Collection Summary</Text>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Today's Collections</Text>
                  <Text style={styles.reportValue}>{formatCurrency(collectionSummary.todayTotal)}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>This Month</Text>
                  <Text style={styles.reportValue}>{formatCurrency(collectionSummary.monthTotal)}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>All Time</Text>
                  <Text style={styles.reportValue}>{formatCurrency(collectionSummary.allTotal)}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Total Collections</Text>
                  <Text style={styles.reportValue}>{collectionSummary.count}</Text>
                </View>
              </View>
            )}

            {activeReport === 'Outstanding' && (
              <View>
                {outstandingLoans.length === 0 ? (
                  <Text style={styles.emptyText}>No outstanding loans available.</Text>
                ) : (
                  outstandingLoans.map((loan) => (
                    <View key={loan.Id || `${loan.PartyId}-${loan.LoanAmount}`} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{loan.PartyName || 'Unknown'}</Text>
                        <Text style={[styles.statusPill, loan.Status === 'Overdue' ? styles.statusOverdue : styles.statusActive]}>{loan.Status}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>Outstanding</Text>
                        <Text style={styles.value}>{formatCurrency(loan.LoanAmount)}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>Installment</Text>
                        <Text style={styles.value}>{formatCurrency(loan.InstallmentAmount)}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeReport === 'Payment History' && (
              <View>
                {filteredRecentPayments.length === 0 ? (
                  <Text style={styles.emptyText}>No recent payment records found.</Text>
                ) : (
                  filteredRecentPayments.map((item) => (
                    <View key={item.Id || item.ReferenceNo || item.CollectionDate} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{item.PartyName || 'Unknown'}</Text>
                        <Text style={styles.cardMeta}>{new Date(item.CollectionDate).toLocaleDateString('en-IN')}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>Amount</Text>
                        <Text style={styles.value}>{formatCurrency(item.Amount)}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>Mode</Text>
                        <Text style={styles.value}>{item.PaymentMode || 'N/A'}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeReport === 'Customer Ledger' && (
              <View>
                {filteredLedgerRows.length === 0 ? (
                  <Text style={styles.emptyText}>No customer ledger data available.</Text>
                ) : (
                  filteredLedgerRows.map((row) => (
                    <View key={row.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{row.name}</Text>
                        <Text style={styles.cardMeta}>{formatCurrency(row.closingBalance)}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>Opening Balance</Text>
                        <Text style={styles.value}>{formatCurrency(row.openingBalance)}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>Loans</Text>
                        <Text style={styles.value}>{formatCurrency(row.loanTotal)}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>Collected</Text>
                        <Text style={styles.value}>{formatCurrency(row.collected)}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>Adjustments</Text>
                        <Text style={styles.value}>{formatCurrency(row.adjustments)}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {exporting ? (
        <View style={styles.floatingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.floatingText}>Preparing export...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statsRight: { flexDirection: 'row', gap: 10 },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  exportLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  content: { flex: 1 },
  section: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: SPACING.sm, color: COLORS.textPrimary },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryCard: {
    flexBasis: '48%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  tabRow: { paddingVertical: SPACING.sm, gap: 10 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  tabIconActive: {
    backgroundColor: '#fff',
  },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  tabTextActive: { color: '#fff' },
  searchSection: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  searchInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipRow: { paddingTop: SPACING.sm, gap: 8 },
  chip: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  reportContent: { padding: SPACING.md, paddingBottom: 32 },
  reportBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  reportHeading: { fontSize: 17, fontWeight: '800', marginBottom: SPACING.sm, color: COLORS.textPrimary },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  reportLabel: { color: COLORS.textSecondary, fontSize: 13 },
  reportValue: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: COLORS.textSecondary, fontSize: 13 },
  value: { color: COLORS.textPrimary, fontWeight: '700' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    fontWeight: '700',
    fontSize: 12,
  },
  statusActive: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  statusOverdue: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, padding: SPACING.lg },
  center: { minHeight: 200, justifyContent: 'center', alignItems: 'center' },
  floatingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingText: { marginTop: SPACING.md, color: '#fff', fontSize: 15, fontWeight: '700' },
});
