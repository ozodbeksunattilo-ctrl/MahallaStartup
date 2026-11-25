import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLightStatusBar } from './Hero';
import { LangSwitch } from './LangSwitch';
import { Logo } from './Logo';
import { Text } from './Text';
import { useTheme } from '@/theme';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Formadan pastdagi qo'shimcha matn (ustida ajratuvchi chiziq) */
  footer?: ReactNode;
}

/**
 * Kirish qobig'i (dizayn «Kirish»): tepada mahalla ko'chasi surati, pastki qismi qorong'ilashgan va ustida
 * kursiv shior; burchakda til tanlagich. Pastda logotip, sarlavha, forma va ajratuvchi chiziqdan keyin izoh.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();
  useLightStatusBar();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Maydon bosilganda forma klaviatura ustiga suriladi (Android edge-to-edge'da ham) */}
      <KeyboardAwareScrollView
        bottomOffset={spacing.xl}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ height: 230 + insets.top, backgroundColor: colors.primaryDark }}>
          <Image
            source={require('../../assets/login-hero.webp')}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            contentFit="cover"
            transition={300}
            accessibilityIgnoresInvertColors
          />
          <LinearGradient
            colors={['rgba(22,32,25,0)', 'rgba(22,32,25,0.82)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 }}
          />
          <Animated.View
            entering={FadeIn.duration(400)}
            style={{ position: 'absolute', top: insets.top + spacing.md, right: spacing.lg }}
          >
            <LangSwitch compact />
          </Animated.View>
          <Animated.View
            entering={FadeInUp.duration(500).delay(150)}
            style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg }}
          >
            <Text variant="title" style={{ color: colors.primaryText, fontStyle: 'italic' }}>
              Mahallamiz — bizning kuchimiz
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.duration(450).delay(100)} style={{ padding: spacing.xl, gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                alignSelf: 'flex-start',
                width: 48,
                height: 48,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Logo size={40} />
            </View>
            <Text variant="display">{title}</Text>
            <Text style={{ color: colors.muted }}>{subtitle}</Text>
          </View>
          {children}
        </Animated.View>

        {footer ? (
          <View style={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            {footer}
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}
