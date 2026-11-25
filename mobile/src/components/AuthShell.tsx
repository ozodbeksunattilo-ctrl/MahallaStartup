import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LangSwitch } from './LangSwitch';
import { Logo } from './Logo';
import { Text } from './Text';
import { useTheme } from '@/theme';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Extra links under the form */
  footer?: ReactNode;
}

/** Sign-in screens: a mahalla street photo on top and a paper form below, as on the landing and the admin panel. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ height: 230 + insets.top, backgroundColor: colors.hero }}>
          <Image source={require('../../assets/images/mahalla-street.webp')} style={{ flex: 1 }} contentFit="cover" contentPosition="center" accessible={false} />
          {/* Scrim so the caption stays readable on the photo */}
          <LinearGradient colors={['transparent', 'rgba(22,32,25,0.82)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 }} />
          <View style={{ position: 'absolute', top: insets.top + spacing.md, right: spacing.lg }}>
            <LangSwitch compact />
          </View>
          <Text
            variant="title"
            style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, color: colors.heroText, fontStyle: 'italic' }}
          >
            Mahallamiz — bizning kuchimiz
          </Text>
        </View>

        <Animated.View entering={FadeInDown.duration(350)} style={{ padding: spacing.xl, gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <View style={{ alignSelf: 'flex-start', padding: 4, borderRadius: radius.sm, backgroundColor: colors.logoTile }}>
              <Logo size={40} />
            </View>
            <Text variant="display">{title}</Text>
            <Text variant="body" style={{ color: colors.muted }}>
              {subtitle}
            </Text>
          </View>
          {children}
        </Animated.View>

        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          {footer}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
