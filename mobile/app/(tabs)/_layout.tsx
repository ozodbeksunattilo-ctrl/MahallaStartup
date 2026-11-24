import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '@/lib/i18n';
import { useTheme, type ToneName } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(active: IconName, inactive: IconName, tone: ToneName) {
  return ({ focused }: { color: ColorValue; focused: boolean }) => <TabIcon name={focused ? active : inactive} tone={tone} focused={focused} />;
}

/** Har bir tab o'z rangida; faol bo'lsa to'liq rang va yumshoq fon, bo'lmasa xira. */
function TabIcon({ name, tone, focused }: { name: IconName; tone: ToneName; focused: boolean }) {
  const { tones } = useTheme();
  return (
    <View
      style={{
        width: 44,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? tones[tone].soft : 'transparent',
      }}
    >
      <Ionicons name={name} size={22} color={tones[tone].fg} style={{ opacity: focused ? 1 : 0.7 }} />
    </View>
  );
}

// TZ 6-bo'lim: Bosh sahifa, Muammolar, Tadbirlar, Chat, Profil
export default function TabsLayout() {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLang();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          // Android edge-to-edge: tizim navigatsiya paneli ustiga chiqmasligi uchun pastki inset qo'shiladi
          height: 56 + Math.max(insets.bottom, Platform.OS === 'ios' ? 26 : 8),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 26 : 8),
          ...shadow.md,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '800', fontSize: 18, color: colors.text },
        headerTitleAlign: 'center',
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        freezeOnBlur: true,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('Bosh sahifa'), headerShown: false, tabBarIcon: icon('home', 'home-outline', 'green') }}
      />
      <Tabs.Screen name="feed" options={{ title: t('Muammolar'), tabBarIcon: icon('megaphone', 'megaphone-outline', 'orange') }} />
      <Tabs.Screen name="events" options={{ title: t('Tadbirlar'), tabBarIcon: icon('calendar', 'calendar-outline', 'purple') }} />
      <Tabs.Screen name="chat" options={{ title: t('Chat'), tabBarIcon: icon('chatbubbles', 'chatbubbles-outline', 'blue') }} />
      <Tabs.Screen
        name="profile"
        options={{ title: t('Profil'), headerShown: false, tabBarIcon: icon('person', 'person-outline', 'teal') }}
      />
    </Tabs>
  );
}
