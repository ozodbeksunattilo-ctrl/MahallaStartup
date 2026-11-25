import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';
import { Text } from './Text';
import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const STEPS: Array<{ label: string; icon: IconName }> = [
  { label: 'Yuborilgan', icon: 'paper-plane' },
  { label: 'Ovozda', icon: 'thumbs-up' },
  { label: "G'olib", icon: 'trophy' },
  { label: 'Bajarilmoqda', icon: 'construct' },
  { label: 'Hal qilindi', icon: 'checkmark' },
];

/** Har bir qadam ustuni kengligi: nuqta va yozuv bir chiziqda turadi */
const CELL = 64;

const STEP_OF: Record<string, number> = {
  PENDING_REVIEW: 0,
  OPEN: 1,
  SELECTED: 2,
  IN_PROGRESS: 3,
  REFERRED: 3,
  RESOLVED: 4,
};

/** Muammo bosib o'tadigan yo'l: yuborilgan → ovozda → g'olib → bajarilmoqda → hal qilindi. */
export function IssueJourney({ status }: { status: string }) {
  const { colors, spacing } = useTheme();
  const current = STEP_OF[status];
  const progress = useSharedValue(0);

  useEffect(() => {
    if (current !== undefined) progress.set(withDelay(150, withTiming(current / (STEPS.length - 1), { duration: 700 })));
  }, [current, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  // Rad etilgan / birlashtirilgan postlarda yo'l ko'rsatilmaydi
  if (current === undefined) return null;

  const done = status === 'RESOLVED';
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ height: 40, justifyContent: 'center', marginHorizontal: CELL / 2 }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.surfaceAlt }} />
        <Animated.View
          style={[{ position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: done ? colors.success : colors.primary }, fill]}
        />
        <View style={{ position: 'absolute', top: 2, left: -CELL / 2, right: -CELL / 2, flexDirection: 'row', justifyContent: 'space-between' }}>
          {STEPS.map((s, i) => {
            const reached = i <= current;
            const active = i === current;
            return (
              <View key={s.label} style={{ width: CELL, alignItems: 'center' }}>
              <Animated.View
                entering={ZoomIn.delay(120 + i * 90).duration(300)}
                style={{
                  width: active ? 36 : 28,
                  height: active ? 36 : 28,
                  marginTop: active ? 0 : 4,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: reached ? (done ? colors.success : colors.primary) : colors.surface,
                  borderWidth: reached ? 0 : 2,
                  borderColor: colors.border,
                  shadowColor: active ? colors.primary : 'transparent',
                  shadowOpacity: active ? 0.35 : 0,
                  shadowRadius: 8,
                  elevation: active ? 4 : 0,
                }}
              >
                <Ionicons name={s.icon} size={active ? 17 : 13} color={reached ? colors.primaryText : colors.muted} />
              </Animated.View>
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {STEPS.map((s, i) => (
          <Text
            key={s.label}
            variant="muted"
            numberOfLines={2}
            style={{
              width: CELL,
              textAlign: 'center',
              fontSize: 11,
              lineHeight: 14,
              fontWeight: i === current ? '700' : '500',
              color: i === current ? colors.text : colors.muted,
            }}
          >
            {s.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
