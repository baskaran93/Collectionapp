import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'customerToken';
const PROFILE_KEY = 'customerProfile';

export async function saveCustomerSession(token, profile) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearCustomerSession() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(PROFILE_KEY);
}

export async function getCustomerToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getCustomerProfile() {
  const stored = await AsyncStorage.getItem(PROFILE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}
