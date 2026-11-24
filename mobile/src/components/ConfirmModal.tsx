import { Ionicons } from '@expo/vector-icons';
import { Modal, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmTitle: string;
  cancelTitle?: string;
  icon?: IconName;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Tasdiqlash oynasi (tizim Alert'i o'rniga): ikonka, sarlavha, matn va ikki tugma. */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmTitle,
  cancelTitle = 'Bekor qilish',
  icon = 'log-out-outline',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors, spacing, radius, shadow } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(8,20,14,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <View
          style={[
            {
              width: '100%',
              maxWidth: 360,
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              padding: spacing.xl,
              alignItems: 'center',
              gap: spacing.md,
            },
            shadow.lg,
          ]}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: destructive ? colors.dangerSoft : colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={30} color={destructive ? colors.danger : colors.primary} />
          </View>
          <Text variant="title" style={{ textAlign: 'center', fontSize: 21 }}>
            {title}
          </Text>
          <Text variant="muted" style={{ textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
            {message}
          </Text>
          <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm }}>
            <Button title={confirmTitle} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} />
            <Button title={cancelTitle} variant="ghost" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
