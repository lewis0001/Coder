import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@orbit/ui';
import { orbitStyles } from '@/theme';
import { useCartStore, getCartTotal } from '@/state/cart';

export function OrdersScreen() {
  const { t } = useTranslation();
  const { items, updateQuantity, removeItem, clear } = useCartStore();
  const hasCart = items.length > 0;
  const total = getCartTotal(items);
  return (
    <Screen>
      <Text style={orbitStyles.title}>{t('orders.title')}</Text>
      <Text style={styles.body}>{t('orders.body')}</Text>

      {hasCart ? (
        <View style={[orbitStyles.card, styles.card]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{t('orders.cartTitle')}</Text>
            <Text style={styles.total}>${total.toFixed(2)}</Text>
          </View>
          {items.map((item) => (
            <View key={`${item.type}-${item.id}`} style={styles.cartRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartName}>{item.name}</Text>
                <Text style={styles.cartMeta}>
                  {item.type === 'FOOD' ? t('orders.foodLabel') : t('orders.shopLabel')}
                </Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() =>
                    item.quantity > 1
                      ? updateQuantity(item.id, item.type, item.quantity - 1)
                      : removeItem(item.id, item.type)
                  }
                >
                  <Text style={styles.qtyButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => updateQuantity(item.id, item.type, item.quantity + 1)}
                >
                  <Text style={styles.qtyButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.lineTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.checkout} onPress={() => clear()}>
            <Text style={styles.checkoutText}>{t('orders.checkoutCta')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[orbitStyles.card, styles.card]}>
          <Text style={styles.cardTitle}>{t('orders.empty')}</Text>
          <Text style={styles.cardHint}>{t('orders.emptyHint')}</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.neutral.ash,
    marginBottom: spacing.xl,
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  total: {
    fontWeight: '700',
    color: colors.primary,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cartName: {
    fontWeight: '600',
    color: colors.neutral.ink,
  },
  cartMeta: {
    color: colors.neutral.ash,
    fontSize: 12,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.neutral.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: {
    fontWeight: '700',
    color: colors.neutral.ink,
  },
  qtyValue: {
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.neutral.ink,
  },
  lineTotal: {
    minWidth: 70,
    textAlign: 'right',
    fontWeight: '700',
    color: colors.neutral.ink,
  },
  checkout: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkoutText: {
    color: colors.neutral.white,
    fontWeight: '700',
  },
});
