import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, I18nManager, Alert, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@orbit/ui';
import { orbitStyles } from '@/theme';
import {
  acceptCourierTask,
  getSeedDefaults,
  sendCourierLocation,
  toggleCourierOnline,
} from '@/lib/api';

export function AccountScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const defaults = useMemo(() => getSeedDefaults(), []);
  const [courierToken, setCourierToken] = useState(defaults.courierToken || '');
  const [courierUserId, setCourierUserId] = useState(defaults.courierUserId);
  const [online, setOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState('');
  const [note, setNote] = useState('');
  const [lat, setLat] = useState('25.2048');
  const [lng, setLng] = useState('55.2708');

  const toggleLanguage = async () => {
    const nextLang = isArabic ? 'en' : 'ar';
    await i18n.changeLanguage(nextLang);
    const shouldBeRTL = nextLang === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(shouldBeRTL);
      Alert.alert('Restart required', 'Please restart the app to apply layout direction.');
    }
  };

  const ensureToken = () => {
    if (!courierToken) {
      setError(t('account.courierTokenMissing'));
      return false;
    }
    return true;
  };

  const handleToggleOnline = async () => {
    if (!ensureToken()) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await toggleCourierOnline(!(online ?? false), courierToken);
      setOnline(res.online);
      setMessage(res.online ? t('account.courierOnline') : t('account.courierOffline'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.courierError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLocation = async () => {
    if (!ensureToken()) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const latitude = Number(lat);
      const longitude = Number(lng);
      await sendCourierLocation({ latitude, longitude }, courierToken);
      setMessage(t('account.courierLocationSent'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.courierError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTask = async () => {
    if (!ensureToken()) return;
    if (!taskId) {
      setError(t('account.courierTaskMissing'));
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await acceptCourierTask(taskId, courierToken);
      setMessage(t('account.courierAccepted', { id: taskId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.courierError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={orbitStyles.title}>{t('account.title')}</Text>
      <Text style={styles.body}>{t('account.body')}</Text>
      <View style={[orbitStyles.card, styles.card]}>
        <Text style={styles.cardTitle}>{t('account.language')}</Text>
        <Text style={styles.cardHint}>{t('account.rtlNote')}</Text>
        <Pressable onPress={toggleLanguage} style={styles.button}>
          <Text style={styles.buttonText}>{isArabic ? t('account.switchToEn') : t('account.switchToAr')}</Text>
        </Pressable>
      </View>

      <View style={[orbitStyles.card, styles.card]}>
        <Text style={styles.cardTitle}>{t('account.courierTitle')}</Text>
        <Text style={styles.cardHint}>{t('account.courierBody')}</Text>
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>{t('account.courierUser')}</Text>
            <TextInput
              value={courierUserId}
              onChangeText={setCourierUserId}
              placeholder="seed-user-courier"
              style={styles.input}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>{t('account.courierToken')}</Text>
            <TextInput
              value={courierToken}
              onChangeText={setCourierToken}
              placeholder={t('account.courierTokenPlaceholder')}
              style={styles.input}
              secureTextEntry
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>{t('account.latitude')}</Text>
            <TextInput value={lat} onChangeText={setLat} style={styles.input} keyboardType="numeric" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>{t('account.longitude')}</Text>
            <TextInput value={lng} onChangeText={setLng} style={styles.input} keyboardType="numeric" />
          </View>
        </View>
        <Pressable style={styles.button} onPress={handleToggleOnline} disabled={loading}>
          <Text style={styles.buttonText}>
            {online ? t('account.goOffline') : t('account.goOnline')}
          </Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={handleLocation} disabled={loading}>
          <Text style={styles.ghostText}>{t('account.sendLocation')}</Text>
        </Pressable>
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>{t('account.taskId')}</Text>
            <TextInput
              value={taskId}
              onChangeText={setTaskId}
              placeholder={t('account.taskPlaceholder', { id: defaults.dropoffAddressId })}
              style={styles.input}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>{t('account.note')}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('account.notePlaceholder')}
              style={styles.input}
            />
          </View>
        </View>
        <Pressable style={styles.ghostButton} onPress={handleAcceptTask} disabled={loading}>
          <Text style={styles.ghostText}>{t('account.acceptTask')}</Text>
        </Pressable>
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.cardHint}>{t('account.courierHint')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.neutral.ash,
    marginBottom: spacing.xl,
  },
  card: {
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.ink,
  },
  cardHint: {
    color: colors.neutral.ash,
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.neutral.cloud,
    fontWeight: '700',
  },
  ghostButton: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.neutral.mist,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  ghostText: {
    color: colors.neutral.ink,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  half: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    color: colors.neutral.ash,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral.mist,
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: colors.neutral.cloud,
  },
  success: {
    color: colors.semantic.success,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.semantic.error,
    marginTop: spacing.xs,
  },
});
