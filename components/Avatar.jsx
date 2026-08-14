import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const PALETTE = [
  { bg: '#EEF2FF', text: '#6366F1' },
  { bg: '#FEF3C7', text: '#D97706' },
  { bg: '#FEE2E2', text: '#EF4444' },
  { bg: '#DCFCE7', text: '#16A34A' },
  { bg: '#FDF2F8', text: '#DB2777' },
  { bg: '#F0F9FF', text: '#0284C7' },
];

export function getAvatarColor(name = '') {
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

export default function Avatar({ name = '', size = 44, radius = 12, uri }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatar, { width: size, height: size, borderRadius: radius }]}
      />
    );
  }

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const { bg, text } = getAvatarColor(name);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: radius, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.text, { color: text, fontSize: size * 0.34 }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { justifyContent: 'center', alignItems: 'center' },
  text: { fontWeight: '700' },
});
