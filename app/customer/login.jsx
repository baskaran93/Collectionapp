import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, RADIUS, useTheme } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { saveCustomerSession, getCustomerToken } from '../../constants/customerSession';

export default function CustomerLoginScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [checkingSession, setCheckingSession] = useState(true);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getCustomerToken();
      if (token) {
        router.replace('/customer/loans');
      } else {
        setCheckingSession(false);
      }
    })();
  }, []);

  const handleLogin = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      Alert.alert('Invalid Number', 'Enter a valid 10-digit mobile number.');
      return;
    }
    if (pin.trim().length < 4) {
      Alert.alert('Invalid PIN', 'Enter the PIN given to you by your loan officer.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/customer-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Phone: digits, Pin: pin.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Login Failed', err.detail || 'Please try again.');
        return;
      }
      const data = await res.json();
      await saveCustomerSession(data.Token, {
        PartyId: data.PartyId,
        PartyName: data.PartyName,
        Phone: data.Phone,
      });
      router.replace('/customer/loans');
    } catch {
      Alert.alert('Connection Error', 'Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <LinearGradient colors={['#6366F1', '#4338CA', '#3730A3']} style={styles.gradient}>
        <View style={styles.checkingWrap}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#6366F1', '#4338CA', '#3730A3']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => router.replace('/')}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Image source={require('../../assets/images/logo.png')} style={styles.logoImg} resizeMode="contain" />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Customer Login</Text>
            <Text style={styles.subtitle}>Enter your mobile number and the PIN given to you by your loan officer.</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PIN</Text>
              <View style={styles.pinRow}>
                <TextInput
                  style={[styles.input, styles.pinInput, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 }]}
                  placeholder="- - - -"
                  placeholderTextColor={colors.textMuted}
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry={!showPin}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPin((v) => !v)}>
                  {showPin ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Log In</Text>}
            </TouchableOpacity>

            <Text style={styles.footer}>© 2025 Insight Expertz • Collection ERP</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const createStyles = (colors) => StyleSheet.create({
  gradient: { flex: 1 },
  checkingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.lg, justifyContent: 'center' },
  backBtn: { position: 'absolute', left: SPACING.lg, zIndex: 1, padding: 6 },
  logoWrap: { alignItems: 'center', marginBottom: SPACING.xl },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoImg: { width: 60, height: 60 },
  card: {
    backgroundColor: colors.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: SPACING.xl },
  fieldGroup: { marginBottom: SPACING.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  pinRow: { flexDirection: 'row' },
  pinInput: { letterSpacing: 4, fontWeight: '700' },
  eyeBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 0,
    borderTopRightRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: SPACING.lg },
});
