import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sentry } from '../lib/sentry';
import Button from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report to Sentry
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😵</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. Please try again.
          </Text>
          <Button title="Try Again" onPress={this.handleRetry} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF3E7',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Silkscreen',
    fontSize: 20,
    color: '#1a1a2e',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#FF4B4B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'Silkscreen',
    fontSize: 14,
    color: '#fff',
  },
});
