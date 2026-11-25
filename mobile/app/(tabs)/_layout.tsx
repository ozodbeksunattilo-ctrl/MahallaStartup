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

/** One tone for every tab, like the landing: the active tab gets green on a soft pill. */
function TabIcon({ name, focused }: { name: IconName; tone: ToneName; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 44,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.primarySoft : 'transparent',
      }}
    >
      <Ionicons name={name} size={22} color={focused ? colors.primary : colors.muted} />
    </View>
  );
}

// TZ 6-bo'lim: Bosh sahifa, Muammolar, Tadbirlar, Chat, Profil
export default function TabsLayout() {
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLang();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          // Android edge-to-edge: tizim navigatsiya paneli ustiga chiqmasligi uchun pastki inset qo'shiladi
          height: 56 + Math.max(insets.bottom, Platform.OS === 'ios' ? 26 : 8),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 26 : 8),
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.semibold },
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontFamily: fonts.serif, fontSize: 20, color: colors.text },
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
