import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Layers, Clock3, Download, TrendingUp, MessageCircle, CalendarDays } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from '../../constants/i18n';
import { SPACING, RADIUS, useTheme } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

const REPORT_KEYS = [
  'collectionSummary',
  'dateWiseCollection',
  'outstanding',
  'paymentHistory',
  'customerLedger',
];

const REPORT_LABELS = {
  collectionSummary: 'Collection Summary',
  dateWiseCollection: 'Date & Party Wise',
  outstanding: 'Outstanding',
  paymentHistory: 'Payment History',
  customerLedger: 'Customer Ledger',
};

const iconMap = {
  collectionSummary: FileText,
  dateWiseCollection: CalendarDays,
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

  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

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

  const collectedByLoan = useMemo(
    () => collections.reduce((acc, c) => {
      acc[c.LoanId] = (acc[c.LoanId] || 0) + safeNumber(c.Amount);
      return acc;
    }, {}),
    [collections],
  );

  const filteredOutstandingLoans = useMemo(
    () => filteredLoans
      .filter((loan) => loan.Status !== 'Closed')
      .map((loan) => ({
        ...loan,
        OutstandingAmount: Math.max(safeNumber(loan.LoanAmount) - (collectedByLoan[loan.Id] || 0), 0),
      })),
    [filteredLoans, collectedByLoan],
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

  const onShareWhatsapp = useCallback(async () => {
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const outstandingTotal = filteredOutstandingLoans.reduce((sum, loan) => sum + loan.OutstandingAmount, 0);
    const message = [
      `Collection Summary — ${dateStr}`,
      '----------------------------',
      `Collected today: ${formatCurrency(collectionSummary.todayTotal)}`,
      `Collected this month: ${formatCurrency(collectionSummary.monthTotal)}`,
      `Outstanding: ${formatCurrency(outstandingTotal)}`,
      `Overdue loans: ${filteredOverdueLoans.length}`,
    ].join('\n');
    try {
      await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
    } catch {
      Alert.alert('WhatsApp not available', 'Could not open WhatsApp. Make sure it is installed.');
    }
  }, [collectionSummary, filteredOutstandingLoans, filteredOverdueLoans]);

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

  const dateWiseRows = useMemo(() => {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (to) to.setHours(23, 59, 59, 999);

    const filtered = filteredCollections.filter((item) => {
      const collectionDate = new Date(item.CollectionDate);
      if (from && collectionDate < from) return false;
      if (to && collectionDate > to) return false;
      return true;
    });

    const dateMap = new Map();
    filtered.forEach((item) => {
      const rawDate = item.CollectionDate;
      const dateKey = new Date(rawDate).toLocaleDateString('en-IN');
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: dateKey, rawDate, parties: new Map(), total: 0 });
      }
      const bucket = dateMap.get(dateKey);
      const partyName = item.PartyName || 'Unknown';
      const prevParty = bucket.parties.get(partyName) || { name: partyName, amount: 0, count: 0 };
      prevParty.amount += safeNumber(item.Amount);
      prevParty.count += 1;
      bucket.parties.set(partyName, prevParty);
      bucket.total += safeNumber(item.Amount);
    });

    return Array.from(dateMap.values())
      .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
      .map((bucket) => ({
        ...bucket,
        parties: Array.from(bucket.parties.values()).sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [filteredCollections, fromDate, toDate]);

  const dateWiseGrandTotal = useMemo(
    () => dateWiseRows.reduce((sum, bucket) => sum + bucket.total, 0),
    [dateWiseRows],
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
    } else if (report === 'dateWiseCollection') {
      header = [t('date'), t('party'), t('amount')];
      rows = [];
      dateWiseRows.forEach((bucket) => {
        bucket.parties.forEach((p) => {
          rows.push([bucket.date, p.name, formatCurrency(p.amount)]);
        });
        rows.push([`${bucket.date} Total`, '', formatCurrency(bucket.total)]);
      });
      rows.push(['Grand Total', '', formatCurrency(dateWiseGrandTotal)]);
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
  }, [collectionSummary, collections, outstandingLoans, recentPayments, ledgerRows, dateWiseRows, dateWiseGrandTotal, today, monthRef]);

  const createHtml = useCallback((report) => {
    const toRows = (items) => items.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('');
    let title = REPORT_LABELS[report] || report;
    let rows = [];
    let headers = [];

    if (report === 'collectionSummary') {
      headers = ['Period', 'Amount', 'Count'];
      rows = [
        ['Today', formatCurrency(collectionSummary.todayTotal), filteredCollections.filter((item) => new Date(item.CollectionDate).toDateString() === today).length],
        ['This Month', formatCurrency(collectionSummary.monthTotal), filteredCollections.filter((item) => {
          const date = new Date(item.CollectionDate);
          return date.getMonth() === monthRef.getMonth() && date.getFullYear() === monthRef.getFullYear();
        }).length],
        ['Total', formatCurrency(collectionSummary.allTotal), collectionSummary.count],
      ];
    } else if (report === 'outstanding') {
      headers = ['Loan ID', 'Party', 'Status', 'Loan Amount', 'Installment'];
      rows = outstandingLoans.map((loan) => [loan.Id, loan.PartyName || 'Unknown', loan.Status, formatCurrency(loan.LoanAmount), formatCurrency(loan.InstallmentAmount)]);
    } else if (report === 'paymentHistory') {
      headers = ['Date', 'Party', 'Amount', 'Mode', 'Reference'];
      rows = filteredRecentPayments.map((item) => [
        new Date(item.CollectionDate).toLocaleDateString('en-IN'),
        item.PartyName || 'Unknown',
        formatCurrency(item.Amount),
        item.PaymentMode || 'N/A',
        item.ReferenceNo || '',
      ]);
    } else if (report === 'dateWiseCollection') {
      headers = ['Date', 'Party', 'Amount'];
      dateWiseRows.forEach((bucket) => {
        bucket.parties.forEach((p) => {
          rows.push([bucket.date, p.name, formatCurrency(p.amount)]);
        });
        rows.push([`<strong>${bucket.date} Total</strong>`, '', `<strong>${formatCurrency(bucket.total)}</strong>`]);
      });
      rows.push([`<strong>Grand Total</strong>`, '', `<strong>${formatCurrency(dateWiseGrandTotal)}</strong>`]);
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
  }, [collectionSummary, collections, outstandingLoans, recentPayments, ledgerRows, dateWiseRows, dateWiseGrandTotal, today, monthRef]);

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
      await shareFile(uri, 'text/csv', `${REPORT_LABELS[selectedReport] || selectedReport} export`);
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
      await shareFile(uri, 'application/pdf', `${REPORT_LABELS[selectedReport] || selectedReport} export`);
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to create PDF export.');
    } finally {
      setExporting(false);
    }
  }, [createHtml, selectedReport, shareFile]);

  const activeReport = selectedReport;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <View style={styles.statsRight}>
          <TouchableOpacity style={styles.exportButton} onPress={onShareWhatsapp} disabled={loading}>
            <MessageCircle size={18} color="#fff" />
          </TouchableOpacity>
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
        ref={scrollRef}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 300 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
              <Text style={styles.summaryValue}>{formatCurrency(filteredOutstandingLoans.reduce((sum, loan) => sum + loan.OutstandingAmount, 0))}</Text>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabRow, { paddingHorizontal: SPACING.md }]}
        >
          {REPORT_KEYS.map((key) => {
            const Icon = iconMap[key];
            const active = selectedReport === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setSelectedReport(key)}
              >
                <View style={[styles.tabIcon, active && styles.tabIconActive]}>
                  <Icon size={14} color={colors.primary} />
                </View>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{REPORT_LABELS[key]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.searchSection}>
          <TextInput
            ref={(r) => { inputRefs.current[0] = r; }}
                onFocus={() => handleFocus(0)}
            style={styles.searchInput}
            placeholder="Search party name..."
            placeholderTextColor={colors.textMuted}
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
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.reportContent}>
            {activeReport === 'collectionSummary' && (
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

            {activeReport === 'dateWiseCollection' && (
              <View>
                <View style={styles.dateFilterRow}>
                  <TouchableOpacity style={styles.dateFilterBtn} onPress={() => setShowFromPicker(true)}>
                    <CalendarDays size={14} color={colors.primary} />
                    <Text style={styles.dateFilterText}>{fromDate ? new Date(fromDate).toLocaleDateString('en-IN') : 'From date'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dateFilterBtn} onPress={() => setShowToPicker(true)}>
                    <CalendarDays size={14} color={colors.primary} />
                    <Text style={styles.dateFilterText}>{toDate ? new Date(toDate).toLocaleDateString('en-IN') : 'To date'}</Text>
                  </TouchableOpacity>
                  {(fromDate || toDate) ? (
                    <TouchableOpacity onPress={() => { setFromDate(''); setToDate(''); }}>
                      <Text style={styles.dateFilterClear}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {showFromPicker ? (
                  <DateTimePicker
                    value={fromDate ? new Date(fromDate) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, selected) => {
                      setShowFromPicker(Platform.OS === 'ios');
                      if (selected) setFromDate(selected.toISOString().split('T')[0]);
                    }}
                  />
                ) : null}
                {showToPicker ? (
                  <DateTimePicker
                    value={toDate ? new Date(toDate) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, selected) => {
                      setShowToPicker(Platform.OS === 'ios');
                      if (selected) setToDate(selected.toISOString().split('T')[0]);
                    }}
                  />
                ) : null}

                {dateWiseRows.length === 0 ? (
                  <Text style={styles.emptyText}>No collections found for the selected filters.</Text>
                ) : (
                  <>
                    {dateWiseRows.map((bucket) => (
                      <View key={bucket.date} style={styles.card}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.cardTitle}>{bucket.date}</Text>
                          <Text style={styles.cardMeta}>{formatCurrency(bucket.total)}</Text>
                        </View>
                        {bucket.parties.map((p) => (
                          <View key={p.name} style={styles.row}>
                            <Text style={styles.label}>{p.name}{p.count > 1 ? ` (x${p.count})` : ''}</Text>
                            <Text style={styles.value}>{formatCurrency(p.amount)}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                    <View style={styles.reportBox}>
                      <View style={[styles.reportRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.reportLabel}>Grand Total</Text>
                        <Text style={styles.reportValue}>{formatCurrency(dateWiseGrandTotal)}</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}

            {activeReport === 'outstanding' && (
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
                        <Text style={styles.value}>{formatCurrency(loan.OutstandingAmount)}</Text>
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

            {activeReport === 'paymentHistory' && (
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

            {activeReport === 'customerLedger' && (
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
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statsRight: { flexDirection: 'row', gap: 10 },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: colors.primary,
  },
  exportLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  content: { flex: 1 },
  section: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: SPACING.sm, color: colors.textPrimary },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryCard: {
    flexBasis: '48%',
    backgroundColor: colors.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  tabRow: { paddingVertical: SPACING.sm, gap: 10 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  tabTextActive: { color: '#fff' },
  searchSection: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipRow: { paddingTop: SPACING.sm, gap: 8 },
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  reportContent: { padding: SPACING.md, paddingBottom: 32 },
  reportBox: {
    backgroundColor: colors.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  reportHeading: { fontSize: 17, fontWeight: '800', marginBottom: SPACING.sm, color: colors.textPrimary },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
  reportLabel: { color: colors.textSecondary, fontSize: 13 },
  reportValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  card: {
    backgroundColor: colors.white,
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardMeta: { fontSize: 12, color: colors.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: colors.textSecondary, fontSize: 13 },
  value: { color: colors.textPrimary, fontWeight: '700' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    fontWeight: '700',
    fontSize: 12,
  },
  statusActive: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  statusOverdue: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  emptyText: { textAlign: 'center', color: colors.textMuted, padding: SPACING.lg },
  dateFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.md, flexWrap: 'wrap' },
  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateFilterText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  dateFilterClear: { fontSize: 13, fontWeight: '700', color: colors.primary },
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
