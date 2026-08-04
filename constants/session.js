import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGIN_TIMESTAMP_KEY = 'loginTimestamp';
const CURRENT_USER_KEY = 'currentUser';
const SESSION_DAYS = 10;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export async function saveSession(user) {
  await AsyncStorage.setItem(LOGIN_TIMESTAMP_KEY, String(Date.now()));
  if (user) {
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
}

export async function clearSession() {
  await AsyncStorage.removeItem(LOGIN_TIMESTAMP_KEY);
  await AsyncStorage.removeItem(CURRENT_USER_KEY);
}

export async function getCurrentUser() {
  const stored = await AsyncStorage.getItem(CURRENT_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export async function isSessionValid() {
  const stored = await AsyncStorage.getItem(LOGIN_TIMESTAMP_KEY);
  if (!stored) return false;
  return Date.now() - Number(stored) < SESSION_MS;
}
