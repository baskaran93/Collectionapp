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
import { Eye, EyeOff } from 'lucide-react-native';
import { useTranslation } from '../constants/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, RADIUS, useTheme } from '../constants/theme';
import { API_BASE } from '../constants/api';
import { saveSession, isSessionValid } from '../constants/session';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    (async () => {
      if (await isSessionValid()) {
        router.replace('/(tabs)');
      } else {
        setCheckingSession(false);
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t('loginFailed'), t('missingFields'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: username.trim(), Password: password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert(t('loginFailed'), err.detail || t('invalidCredentials'));
        return;
      }
      const user = await res.json().catch(() => null);
      await saveSession(user);
      router.replace('/(tabs)');
    } catch {
      Alert.alert(t('connectionError'), t('connectionError'));
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>{t('welcomeBack')}</Text>
            <Text style={styles.subtitle}>{t('signInSubtitle')}</Text>

            {/* Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('username')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('enterUsername')}
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('password')}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 }]}
                  placeholder={t('enterPassword')}
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>{t('logIn')}</Text>
              )}
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
  passwordRow: { flexDirection: 'row' },
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
