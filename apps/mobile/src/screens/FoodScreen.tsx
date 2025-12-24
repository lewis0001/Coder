import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { orbitStyles } from '@/theme';
import { colors, spacing } from '@orbit/ui';
import { fetchRestaurants, Restaurant } from '@/lib/api';
import { useCartStore } from '@/state/cart';

const FALLBACK_RESTAURANTS: Restaurant[] = [
  { id: 'fallback-1', name: 'Sunset Grill', description: 'BBQ • 25-35 min', rating: 4.6 },
  { id: 'fallback-2', name: 'Bella Pasta', description: 'Italian • 20-30 min', rating: 4.7 },
];

export function FoodScreen() {
  const { t } = useTranslation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>(FALLBACK_RESTAURANTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    let mounted = true;
    fetchRestaurants()
      .then((res) => {
        if (!mounted) return;
        setRestaurants(res.items.length ? res.items : FALLBACK_RESTAURANTS);
      })
      .catch(() => {
        if (!mounted) return;
        setError(t('food.body'));
        setRestaurants(FALLBACK_RESTAURANTS);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [t]);

  return (
    <Screen>
      <Text style={orbitStyles.title}>{t('food.title')}</Text>
      <Text style={styles.body}>{t('food.body')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <View style={[orbitStyles.card, styles.card]}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardHint}>
              {item.description || item.cuisines?.map((c) => c.cuisine.name).join(' • ') || 'Nearby'}
            </Text>
            {item.rating ? <Text style={styles.rating}>{`★ ${item.rating.toFixed(1)}`}</Text> : null}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                addItem({
                  id: item.id,
                  name: item.name,
                  price: 12.99,
                  type: 'FOOD',
                  sourceId: item.id,
                })
              }
            >
              <Text style={styles.addButtonText}>{t('food.addToCart')}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.neutral.ash,
    marginBottom: spacing.lg,
  },
  card: {
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.ink,
  },
  cardHint: {
    color: colors.neutral.ash,
  },
  rating: {
    color: colors.semantic.success,
    fontWeight: '700',
  },
  addButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.neutral.white,
    fontWeight: '700',
  },
  errorText: {
    color: colors.semantic.danger,
    marginBottom: spacing.md,
  },
});
