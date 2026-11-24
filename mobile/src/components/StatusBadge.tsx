import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Text } from './Text';
import { useTheme, type Colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type Tone = 'warning' | 'danger' | 'info' | 'success' | 'muted';

// Rang holatning yagona belgisi emas: har bir holatda ikonka ham bor (TZ 6-bo'lim «Dizayn»).
const STYLE: Record<string, { icon: IconName; tone: Tone }> = {
  PENDING_REVIEW: { icon: 'hourglass-outline', tone: 'warning' },
  REJECTED: { icon: 'create-outline', tone: 'danger' },
  OPEN: { icon: 'radio-button-on-outline', tone: 'info' },
  MERGED: { icon: 'git-merge-outline', tone: 'muted' },
  SELECTED: { icon: 'trophy', tone: 'success' },
  IN_PROGRESS: { icon: 'construct-outline', tone: 'info' },
  REFERRED: { icon: 'paper-plane-outline', tone: 'warning' },
  RESOLVED: { icon: 'checkmark-circle', tone: 'success' },
  CANCELLED: { icon: 'close-circle-outline', tone: 'danger' },
  COMPLETED: { icon: 'checkmark-done-outline', tone: 'success' },
  PUBLISHED: { icon: 'calendar-outline', tone: 'info' },
};

const SOFT: Record<Tone, keyof Colors> = {
  warning: 'warningSoft',
  danger: 'dangerSoft',
  info: 'infoSoft',
  success: 'successSoft',
  muted: 'surfaceAlt',
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const { colors, radius } = useTheme();
  const s = STYLE[status] ?? { icon: 'ellipse-outline' as IconName, tone: 'muted' as const };
  const color = s.tone === 'muted' ? colors.muted : colors[s.tone];
  return (
    <View
      accessibilityLabel={`Holat: ${label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 5,
        backgroundColor: colors[SOFT[s.tone]],
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Ionicons name={s.icon} size={13} color={color} />
      <Text variant="label" style={{ color, fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}
