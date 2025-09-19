import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { StyleSheet, Pressable, Alert } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DebugScreen() {
  const [isClearing, setIsClearing] = useState(false);
  const colorScheme = useColorScheme();

  const clearCache = async () => {
    try {
      setIsClearing(true);

      // Get all keys from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();

      // Filter for cache keys (those that start with our cache prefix)
      const cacheKeys = allKeys.filter(key => key.startsWith('restaurants_cache_'));

      // Remove all cache keys
      await AsyncStorage.multiRemove(cacheKeys);

      Alert.alert(
        'Cache Cleared',
        `Successfully cleared ${cacheKeys.length} cached restaurant entries.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert(
        'Error',
        'Failed to clear cache. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="wrench.fill"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Debug
        </ThemedText>
      </ThemedView>

      <ThemedText style={styles.description}>
        Debug tools and utilities for the RandoBites app.
      </ThemedText>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Cache Management
        </ThemedText>
        <ThemedText style={styles.sectionDescription}>
          Clear cached restaurant data to force fresh API calls.
        </ThemedText>

        <Pressable
          style={[
            styles.button,
            { backgroundColor: Colors[colorScheme ?? 'light'].tint },
            isClearing && styles.buttonDisabled
          ]}
          onPress={clearCache}
          disabled={isClearing}
        >
          <IconSymbol
            name={isClearing ? "arrow.clockwise" : "trash.fill"}
            size={20}
            color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'}
            style={styles.buttonIcon}
          />
          <ThemedText style={[styles.buttonText, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>
            {isClearing ? 'Clearing Cache...' : 'Clear Restaurant Cache'}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  description: {
    marginBottom: 20,
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  sectionDescription: {
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
