import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@orbit/ui';
import { orbitStyles } from '@/theme';
import { BoxEstimateResponse, createBoxShipment, estimateBoxShipment, getSeedDefaults } from '@/lib/api';

export function BoxScreen() {
  const { t } = useTranslation();
  const seeds = useMemo(() => getSeedDefaults(), []);
  const [regionId, setRegionId] = useState(seeds.regionId);
  const [pickupAddress, setPickupAddress] = useState('Downtown pickup spot');
  const [pickupLatitude, setPickupLatitude] = useState('25.2048');
  const [pickupLongitude, setPickupLongitude] = useState('55.2708');
  const [dropoffLatitude, setDropoffLatitude] = useState('25.1951');
  const [dropoffLongitude, setDropoffLongitude] = useState('55.2802');
  const [packageSize, setPackageSize] = useState('SMALL');
  const [packageWeight, setPackageWeight] = useState('1.2');
  const [instructions, setInstructions] = useState('Leave at reception');
  const [dropoffAddressId, setDropoffAddressId] = useState(seeds.dropoffAddressId);
  const [userId, setUserId] = useState(seeds.customerUserId);
  const [scheduledAt, setScheduledAt] = useState('');

  const [estimate, setEstimate] = useState<BoxEstimateResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedPayload = useMemo(() => {
    const parse = (value: string, fallback: number) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    };
    return {
      regionId,
      pickupLatitude: parse(pickupLatitude, 0),
      pickupLongitude: parse(pickupLongitude, 0),
      dropoffLatitude: parse(dropoffLatitude, 0),
      dropoffLongitude: parse(dropoffLongitude, 0),
      packageSize,
      packageWeight: parse(packageWeight, 0),
    };
  }, [
    regionId,
    pickupLatitude,
    pickupLongitude,
    dropoffLatitude,
    dropoffLongitude,
    packageSize,
    packageWeight,
  ]);

  const createPayload = useMemo(
    () => ({
      userId,
      dropoffAddressId,
      pickupAddress,
      pickupLatitude: parsedPayload.pickupLatitude,
      pickupLongitude: parsedPayload.pickupLongitude,
      packageSize,
      packageWeight: parsedPayload.packageWeight,
      instructions: instructions || undefined,
      scheduledAt: scheduledAt || undefined,
    }),
    [
      dropoffAddressId,
      instructions,
      parsedPayload.packageWeight,
      parsedPayload.pickupLatitude,
      parsedPayload.pickupLongitude,
      packageSize,
      pickupAddress,
      scheduledAt,
      userId,
    ],
  );

  const handleEstimate = async () => {
    setEstimating(true);
    setError(null);
    setResultMessage(null);
    try {
      const res = await estimateBoxShipment(parsedPayload);
      setEstimate(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('box.error');
      setError(message);
      setEstimate(null);
    } finally {
      setEstimating(false);
    }
  };

  const handleCreate = async () => {
    if (!userId || !dropoffAddressId) {
      setError(t('box.missingUser'));
      return;
    }
    setCreating(true);
    setError(null);
    setResultMessage(null);
    try {
      const res = await createBoxShipment(createPayload);
      setResultMessage(t('box.created', { id: res.orderId, status: res.status }));
      setEstimate(res.estimate);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('box.error');
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={orbitStyles.title}>{t('box.title')}</Text>
        <Text style={styles.body}>{t('box.body')}</Text>

        <View style={[orbitStyles.card, styles.card]}>
          <Text style={styles.cardTitle}>{t('box.quickEstimate')}</Text>
          <Input
            label={t('box.regionId')}
            value={regionId}
            onChangeText={setRegionId}
            placeholder="seed-region-orbit"
          />
          <View style={styles.row}>
            <Input
              label={t('box.pickupLat')}
              value={pickupLatitude}
              onChangeText={setPickupLatitude}
              style={styles.half}
            />
            <Input
              label={t('box.pickupLng')}
              value={pickupLongitude}
              onChangeText={setPickupLongitude}
              style={styles.half}
            />
          </View>
          <View style={styles.row}>
            <Input
              label={t('box.dropoffLat')}
              value={dropoffLatitude}
              onChangeText={setDropoffLatitude}
              style={styles.half}
            />
            <Input
              label={t('box.dropoffLng')}
              value={dropoffLongitude}
              onChangeText={setDropoffLongitude}
              style={styles.half}
            />
          </View>
          <Input
            label={t('box.packageSize')}
            value={packageSize}
            onChangeText={setPackageSize}
            placeholder="SMALL/MEDIUM/LARGE"
          />
          <Input
            label={t('box.packageWeight')}
            value={packageWeight}
            onChangeText={setPackageWeight}
            placeholder="1.5"
          />
          <TouchableOpacity style={orbitStyles.primaryButton} onPress={handleEstimate}>
            {estimating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={orbitStyles.primaryButtonText}>{t('box.estimateCta')}</Text>
            )}
          </TouchableOpacity>
          {estimate ? (
            <View style={styles.estimateBox}>
              <Text style={styles.estimateTitle}>{t('box.estimate')}</Text>
              <Text style={styles.estimateLine}>
                {t('box.distance')}: {estimate.distanceKm} km
              </Text>
              <Text style={styles.estimateLine}>
                {t('box.deliveryFee')}: {estimate.currency} {estimate.deliveryFee}
              </Text>
              <Text style={styles.estimateLine}>
                {t('box.tax')}: {estimate.currency} {estimate.tax}
              </Text>
              <Text style={styles.estimateTotal}>
                {t('box.total')}: {estimate.currency} {estimate.total}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[orbitStyles.card, styles.card]}>
          <Text style={styles.cardTitle}>{t('box.createTitle')}</Text>
          <Input
            label={t('box.pickupAddress')}
            value={pickupAddress}
            onChangeText={setPickupAddress}
            placeholder={t('box.pickupPlaceholder')}
          />
          <Input
            label={t('box.userId')}
            value={userId}
            onChangeText={setUserId}
            placeholder="seed-user-customer"
          />
          <Input
            label={t('box.dropoffAddressId')}
            value={dropoffAddressId}
            onChangeText={setDropoffAddressId}
            placeholder="seed-address-user"
          />
          <Input
            label={t('box.instructions')}
            value={instructions}
            onChangeText={setInstructions}
            placeholder={t('box.instructionsPlaceholder')}
          />
          <Input
            label={t('box.schedule')}
            value={scheduledAt}
            onChangeText={setScheduledAt}
            placeholder={t('box.schedulePlaceholder')}
          />
          <TouchableOpacity style={orbitStyles.primaryButton} onPress={handleCreate}>
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={orbitStyles.primaryButtonText}>{t('box.createCta')}</Text>
            )}
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {resultMessage ? <Text style={styles.success}>{resultMessage}</Text> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Input({ label, style, ...props }: { label: string; style?: any } & React.ComponentProps<
  typeof TextInput
>) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, style]}
        placeholderTextColor={colors.neutral.fog}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.lg,
  },
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
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.neutral.ash,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral.mist,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.neutral.ink,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  estimateBox: {
    backgroundColor: colors.neutral.cloud,
    borderRadius: 12,
    padding: spacing.md,
    gap: 4,
  },
  estimateTitle: {
    fontWeight: '700',
    color: colors.neutral.ink,
  },
  estimateLine: {
    color: colors.neutral.ash,
  },
  estimateTotal: {
    color: colors.accent.coral,
    fontWeight: '700',
  },
  error: {
    color: colors.semantic.danger,
    marginTop: spacing.sm,
  },
  success: {
    color: colors.semantic.success,
    marginTop: spacing.sm,
  },
});
