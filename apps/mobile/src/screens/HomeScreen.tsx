import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { colors, spacing, radii } from '@orbit/ui';
import { orbitStyles } from '@/theme';
import { fetchRestaurants, fetchProducts, Restaurant, Product } from '@/lib/api';

const SHORTCUTS = [
  { labelKey: 'tabs.food', color: colors.primary },
  { labelKey: 'tabs.shop', color: colors.secondary },
  { labelKey: 'tabs.box', color: colors.neutral.ash },
  { labelKey: 'tabs.wallet', color: colors.semantic.info },
];

export function HomeScreen() {
  const { t } = useTranslation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchRestaurants(), fetchProducts({ limit: 4 })])
      .then(([restRes, productRes]) => {
        if (!mounted) return;
        setRestaurants(restRes.items.slice(0, 3));
        setProducts(productRes.items.slice(0, 4));
      })
      .catch(() => {
        if (!mounted) return;
        setRestaurants([]);
        setProducts([]);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text style={orbitStyles.subtitle}>{t('home.greeting')}</Text>
          <Text style={orbitStyles.title}>{t('home.subtitle')}</Text>
        </View>
        <View style={styles.walletPill}>
          <Text style={styles.walletLabel}>{t('home.wallet')}</Text>
          <Text style={styles.walletValue}>$120.00</Text>
        </View>
      </View>

      <View style={orbitStyles.sectionSpacing}>
        <Text style={styles.sectionTitle}>{t('home.shortcuts')}</Text>
        <View style={styles.chipRow}>
          {SHORTCUTS.map((item) => (
            <View key={item.labelKey} style={[styles.chip, { backgroundColor: `${item.color}1A` }]}>
              <Text style={[styles.chipText, { color: item.color }]}>{t(item.labelKey)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={orbitStyles.sectionSpacing}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>{t('home.recentOrders')}</Text>
          <Text style={styles.link}>{t('orders.cta')}</Text>
        </View>
        <View style={orbitStyles.card}>
          <Text style={styles.cardTitle}>Orbit Mart</Text>
          <Text style={styles.cardHint}>Delivered • 2 items • Yesterday</Text>
        </View>
      </View>

      <View style={orbitStyles.sectionSpacing}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>{t('home.recommended')}</Text>
          <Text style={styles.link}>{t('food.cta')}</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={styles.recoGrid}>
            {restaurants.slice(0, 2).map((restaurant) => (
              <View key={restaurant.id} style={[orbitStyles.card, styles.recoCard]}>
                <Text style={styles.cardTitle}>{restaurant.name}</Text>
                <Text style={styles.cardHint}>
                  {restaurant.description ||
                    restaurant.cuisines?.map((c) => c.cuisine.name).join(' • ') ||
                    'Nearby'}
                </Text>
              </View>
            ))}
            {products.length ? (
              <View style={[orbitStyles.card, styles.recoCard]}>
                <Text style={styles.cardTitle}>{products[0].name}</Text>
                <Text style={styles.cardHint}>{products[0].description || 'Marketplace pick'}</Text>
                <Text style={styles.price}>${products[0].basePrice}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  walletPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.mist,
    minWidth: 140,
  },
  walletLabel: {
    color: colors.neutral.ash,
    fontSize: 12,
  },
  walletValue: {
    marginTop: spacing.xs,
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.ink,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.ink,
  },
  cardHint: {
    marginTop: spacing.xs,
    color: colors.neutral.ash,
  },
  price: {
    marginTop: spacing.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  recoGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  recoCard: {
    flexBasis: '48%',
    flexGrow: 1,
  },
});
