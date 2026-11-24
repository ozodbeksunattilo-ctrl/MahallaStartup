import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LangSwitch } from './LangSwitch';
import { Logo } from './Logo';
import { Text } from './Text';
import { useTheme } from '@/theme';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Formadan pastdagi qo'shimcha havolalar */
  footer?: ReactNode;
}

/** Kirish / parol ekranlari qobig'i: toza oq-yashil-ko'k fon, aniq logotip, burchakda til tanlagich va «varaq». */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, shadow } = useTheme();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <LinearGradient
          colors={['#ffffff', '#ffffff', colors.primarySoft]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
            paddingTop: insets.top + spacing.md,
            paddingBottom: 72,
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <View style={{ alignSelf: 'stretch', alignItems: 'flex-end', paddingHorizontal: spacing.lg }}>
            <Animated.View entering={FadeIn.duration(500).delay(400)}>
              <LangSwitch compact />
            </Animated.View>
          </View>
          <Animated.View entering={ZoomIn.springify().damping(14).delay(100)} style={{ marginTop: spacing.sm }}>
            <Logo size={150} full />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(500).delay(450)}>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.md }}>
              <View style={{ width: 28, height: 4, borderRadius: 2, backgroundColor: colors.primary }} />
              <View style={{ width: 12, height: 4, borderRadius: 2, backgroundColor: colors.secondary }} />
              <View style={{ width: 6, height: 4, borderRadius: 2, backgroundColor: '#f59e0b' }} />
            </View>
          </Animated.View>
        </LinearGradient>

        <Animated.View
          entering={FadeInUp.duration(550).delay(250).springify().damping(16)}
          style={[
            {
              marginTop: -44,
              marginHorizontal: spacing.lg,
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              padding: spacing.xl,
              gap: spacing.lg,
            },
            shadow.md,
          ]}
        >
          <View style={{ gap: 4 }}>
            <Text variant="title">{title}</Text>
            <Text variant="muted">{subtitle}</Text>
          </View>
          {children}
        </Animated.View>

        <Animated.View
          entering={FadeIn.duration(600).delay(600)}
          style={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md, alignItems: 'center' }}
        >
          {footer}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
