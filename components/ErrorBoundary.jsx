import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemeContext, SPACING, RADIUS, LIGHT_COLORS } from '../constants/theme';

export default class ErrorBoundary extends React.Component {
  static contextType = ThemeContext;

  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const colors = this.context?.colors || LIGHT_COLORS;
      const styles = createStyles(colors);
      return (
        <View style={styles.root}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleReset}>
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const createStyles = (colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: SPACING.sm },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: SPACING.lg },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
