import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import './src/i18n';
import { useTranslation } from 'react-i18next';
import { orbitNavTheme } from '@/theme';
import { HomeScreen } from '@/screens/HomeScreen';
import { FoodScreen } from '@/screens/FoodScreen';
import { ShopScreen } from '@/screens/ShopScreen';
import { BoxScreen } from '@/screens/BoxScreen';
import { WalletScreen } from '@/screens/WalletScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { AccountScreen } from '@/screens/AccountScreen';
import { colors, components, radii, spacing, typography } from '@orbit/ui';

const Tab = createBottomTabNavigator();

export default function App() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const shouldBeRTL = i18n.language === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(shouldBeRTL);
    }
  }, [i18n.language]);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={orbitNavTheme}>
        <StatusBar style="dark" />
        <Tab.Navigator
          sceneContainerStyle={{ backgroundColor: colors.neutral.cloud }}
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.neutral.ash,
            tabBarItemStyle: { borderRadius: radii.sm },
            tabBarLabelStyle: {
              fontSize: typography.sizes.caption,
              fontWeight: '600',
              marginBottom: spacing.xs,
            },
            tabBarStyle: {
              height: components.tab.height,
              paddingVertical: spacing.sm,
              backgroundColor: colors.neutral.cloud,
              borderTopColor: colors.neutral.mist,
              borderTopWidth: 1,
            },
            tabBarIcon: ({ color, size }) => {
              const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
                home: 'home',
                food: 'fast-food',
                shop: 'cart',
                box: 'cube',
                wallet: 'wallet',
                orders: 'receipt',
                account: 'person',
              };
              const key = route.name.toLowerCase();
              const iconName = iconMap[key] || 'ellipse';
              const iconSize = size ?? components.tab.height / 2.4;
              return <Ionicons name={iconName} size={iconSize} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
          <Tab.Screen name="Food" component={FoodScreen} options={{ title: t('tabs.food') }} />
          <Tab.Screen name="Shop" component={ShopScreen} options={{ title: t('tabs.shop') }} />
          <Tab.Screen name="Box" component={BoxScreen} options={{ title: t('tabs.box') }} />
          <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: t('tabs.wallet') }} />
          <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: t('tabs.orders') }} />
          <Tab.Screen name="Account" component={AccountScreen} options={{ title: t('tabs.account') }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
