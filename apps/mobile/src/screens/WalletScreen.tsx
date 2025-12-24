import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@orbit/ui';
import { orbitStyles } from '@/theme';

export function WalletScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Text style={orbitStyles.title}>{t('wallet.title')}</Text>
      <View style={[orbitStyles.card, styles.balanceCard]}>
        <Text style={styles.label}>{t('wallet.balance')}</Text>
        <Text style={styles.amount}>$120.00</Text>
      </View>
      <Text style={styles.body}>{t('wallet.body')}</Text>
      <View style={[orbitStyles.card, styles.card]}>
        <Text style={styles.cardTitle}>Top up</Text>
        <Text style={styles.cardHint}>Stripe PaymentIntents (test) with wallet credit</Text>
      </View>
      <View style={[orbitStyles.card, styles.card]}>
        <Text style={styles.cardTitle}>Recent activity</Text>
        <Text style={styles.cardHint}>+ $25.00 loyalty • - $12.40 order</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    gap: spacing.xs,
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  label: {
    color: colors.neutral.ash,
  },
  body: {
    color: colors.neutral.ash,
    marginVertical: spacing.lg,
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
});
