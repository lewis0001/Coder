import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { orbitStyles } from '@/theme';
import { colors, spacing } from '@orbit/ui';
import { fetchProducts, Product } from '@/lib/api';
import { useCartStore } from '@/state/cart';

const FALLBACK_PRODUCTS: Product[] = [
  { id: 'fallback-p1', name: 'Grocery Item 1', description: 'Pantry essential', basePrice: '5.50' },
  { id: 'fallback-p2', name: 'Grocery Item 2', description: 'Fresh pick', basePrice: '7.25' },
];

export function ShopScreen() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    let mounted = true;
    fetchProducts({ limit: 12 })
      .then((res) => {
        if (!mounted) return;
        setProducts(res.items.length ? res.items : FALLBACK_PRODUCTS);
      })
      .catch(() => {
        if (!mounted) return;
        setError(t('shop.body'));
        setProducts(FALLBACK_PRODUCTS);
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
      <Text style={orbitStyles.title}>{t('shop.title')}</Text>
      <Text style={styles.body}>{t('shop.body')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <View style={[orbitStyles.card, styles.card]}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardHint}>{item.description || item.category?.name || 'Marketplace'}</Text>
            <Text style={styles.price}>${item.basePrice}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                addItem({
                  id: item.id,
                  name: item.name,
                  price: Number(item.basePrice),
                  type: 'SHOP',
                  sourceId: item.id,
                })
              }
            >
              <Text style={styles.addButtonText}>{t('shop.addToCart')}</Text>
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
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.ink,
  },
  cardHint: {
    color: colors.neutral.ash,
  },
  price: {
    marginTop: spacing.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  addButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.neutral.ink,
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
