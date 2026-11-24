import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorState, Loading } from '@/components/StateView';
import { Text } from '@/components/Text';
import { api, newKey } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/format';
import { errorMessage } from '@/lib/hooks';
import { useLang } from '@/lib/i18n';
import { reportContent } from '@/lib/report';
import type { ChatMessage, Page } from '@/lib/types';
import { useTheme } from '@/theme';

type LocalState = 'sending' | 'failed';
interface Row extends ChatMessage {
  /** Faqat yuborilmagan/yuborilayotgan xabarlarda */
  local?: LocalState;
  clientMessageId?: string;
}

const POLL_MS = 4000;

interface ChatViewProps {
  /** API yo'li: '/chat/messages' (mahalla) yoki '/support/messages' (admin bilan) */
  base: string;
  hint: string;
  emptyTitle: string;
  emptyHint: string;
}

// API: GET /chat/messages (before= eskilar, after= yangilar) · POST /chat/messages { text, clientMessageId }
// Realtime o'rniga ~4 s da `after=<oxirgi id>` bilan so'raladi: uzilishdan keyin ham aynan shu yerdan davom etadi.
export function ChatView({ base, hint, emptyTitle, emptyHint }: ChatViewProps) {
  const { colors, tones, spacing } = useTheme();
  const { t } = useLang();
  // Ro'yxat inverted: 0-element — eng yangi
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const rowsRef = useRef<Row[]>([]);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const lastServerId = () => rowsRef.current.find((r) => !r.local)?.id ?? null;

  const loadInitial = useCallback(async () => {
    try {
      const res = await api<Page<ChatMessage>>(`${base}?limit=30`);
      setRows((prev) => [...prev.filter((r) => r.local), ...res.items]);
      setCursor(res.nextCursor);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [base]);

  const retryInitial = () => {
    setLoading(true);
    setError(null);
    void loadInitial();
  };

  const poll = useCallback(async () => {
    const after = lastServerId();
    if (!after) return;
    try {
      const res = await api<Page<ChatMessage>>(`${base}?after=${after}&limit=100`);
      if (res.items.length === 0) return;
      setRows((prev) => {
        const known = new Set(prev.map((r) => r.id));
        // `after` eskisidan yangisiga qaytadi; o'zimiz yuborganlari allaqachon ro'yxatda bo'lishi mumkin
        const fresh = res.items.filter((m) => !known.has(m.id)).reverse();
        return fresh.length ? [...fresh, ...prev] : prev;
      });
    } catch {
      // Tarmoq uzilsa — keyingi tikda qayta uriniladi
    }
  }, [base]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void loadInitial();
  }, [loadInitial]);

  // Faqat ekran ko'rinib turganda so'raymiz
  useFocusEffect(
    useCallback(() => {
      void poll();
      const t = setInterval(() => void poll(), POLL_MS);
      return () => clearInterval(t);
    }, [poll]),
  );

  async function loadOlder() {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await api<Page<ChatMessage>>(`${base}?before=${cursor}&limit=30`);
      setRows((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch {
      // keyingi scroll'da qayta uriniladi
    } finally {
      setLoadingOlder(false);
    }
  }

  async function deliver(row: Row) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, local: 'sending' } : r)));
    try {
      // Bir xil clientMessageId: qayta yuborish dublikat yaratmaydi
      const saved = await api<ChatMessage>(base, {
        method: 'POST',
        json: { text: row.text, clientMessageId: row.clientMessageId },
      });
      setRows((prev) => {
        // Polling server xabarini allaqachon qo'shgan bo'lishi mumkin
        const withoutLocal = prev.filter((r) => r.id !== row.id);
        return withoutLocal.some((r) => r.id === saved.id) ? withoutLocal : [{ ...saved }, ...withoutLocal];
      });
    } catch (e) {
      setSendError(errorMessage(e));
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, local: 'failed' } : r)));
    }
  }

  function send() {
    const t = text.trim();
    if (!t) return;
    setText('');
    setSendError(null);
    const clientMessageId = newKey();
    const row: Row = {
      id: `local-${clientMessageId}`,
      clientMessageId,
      text: t,
      senderId: 'me',
      senderName: 'Siz',
      senderRole: 'RESIDENT',
      mine: true,
      createdAt: new Date().toISOString(),
      local: 'sending',
    };
    setRows((prev) => [row, ...prev]);
    void deliver(row);
  }

  const renderItem = ({ item, index }: { item: Row; index: number }) => {
    const mine = item.mine;
    const admin = item.senderRole === 'MAHALLA_ADMIN';
    // Inverted: index+1 — undan oldingi (eskiroq) xabar. Bir odamning ketma-ket xabarlarida avatar/ism takrorlanmaydi.
    const older = rows[index + 1];
    const newer = rows[index - 1];
    const firstInGroup = !older || older.senderId !== item.senderId;
    const lastInGroup = !newer || newer.senderId !== item.senderId;
    const initials = item.senderName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('');

    const newDay = !older || formatDate(older.createdAt) !== formatDate(item.createdAt);

    return (
      <>
        {newDay ? (
          <View style={{ alignSelf: 'center', marginTop: spacing.md, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surfaceAlt }}>
            <Text variant="muted" style={{ fontSize: 12 }}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        ) : null}
      <Pressable
        accessibilityHint={mine ? undefined : 'Shikoyat qilish uchun bosib turing'}
        onLongPress={mine || item.local ? undefined : () => reportContent('CHAT_MESSAGE', item.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: mine ? 'flex-end' : 'flex-start',
          gap: spacing.sm,
          marginTop: firstInGroup ? spacing.sm : 0,
        }}
      >
        {!mine ? (
          <View style={{ width: 30, height: 30 }}>
            {lastInGroup ? (
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: admin ? tones.blue.soft : colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {admin ? (
                  <Ionicons name="shield-checkmark" size={16} color={tones.blue.fg} />
                ) : (
                  <Text variant="label" style={{ color: colors.primary, fontSize: 11, lineHeight: 14 }}>
                    {initials}
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={{ maxWidth: '78%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          <View
            style={{
              backgroundColor: mine ? colors.primary : admin ? tones.blue.soft : colors.surface,
              borderWidth: admin ? 1 : mine ? 0 : 1,
              borderColor: admin ? tones.blue.fg : colors.border,
              borderRadius: 18,
              borderBottomRightRadius: mine && lastInGroup ? 4 : 18,
              borderBottomLeftRadius: !mine && lastInGroup ? 4 : 18,
              paddingHorizontal: 14,
              paddingTop: 8,
              paddingBottom: 6,
              opacity: item.local === 'sending' ? 0.7 : 1,
              gap: 2,
            }}
          >
            {!mine && firstInGroup ? (
              <Text variant="label" style={{ color: admin ? tones.blue.fg : colors.primary, fontSize: 12 }}>
                {admin ? `${t('Admin')} · ${item.senderName}` : item.senderName}
              </Text>
            ) : null}
            <Text style={{ color: mine ? colors.primaryText : colors.text }} raw>{item.text}</Text>
            <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4 }}>
              <Text
                variant="muted"
                style={{ color: mine ? colors.primaryText : colors.muted, opacity: 0.75, fontSize: 10.5, lineHeight: 13 }}
              >
                {item.local === 'failed' ? 'Yuborilmadi' : item.local === 'sending' ? '' : formatTime(item.createdAt)}
              </Text>
              {mine && item.local === 'sending' ? (
                <Ionicons name="time-outline" size={11} color={colors.primaryText} />
              ) : null}
              {mine && !item.local ? <Ionicons name="checkmark-done" size={13} color={colors.primaryText} /> : null}
            </View>
          </View>
          {item.local === 'failed' ? (
            <Pressable accessibilityRole="button" onPress={() => void deliver(item)} style={{ paddingVertical: 6 }}>
              <Text variant="label" style={{ color: colors.danger }}>
                ↻ Qayta yuborish
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginHorizontal: spacing.md,
            marginTop: spacing.sm,
            padding: spacing.md,
            borderRadius: 14,
            backgroundColor: tones.blue.soft,
          }}
        >
          <Ionicons name="shield-checkmark" size={20} color={tones.blue.fg} />
          <Text variant="muted" style={{ flex: 1, color: colors.text }}>
            {hint}
          </Text>
        </View>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={retryInitial} />
        ) : (
          <FlatList
            inverted
            data={rows}
            keyExtractor={(r) => r.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: spacing.md, gap: 2 }}
            onEndReached={() => void loadOlder()}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={{ transform: [{ scaleY: -1 }], alignItems: 'center', padding: spacing.xl }}>
                <Text variant="heading">{emptyTitle}</Text>
                <Text variant="muted">{emptyHint}</Text>
              </View>
            }
          />
        )}
        {sendError ? (
          <Text style={{ color: colors.danger, paddingHorizontal: spacing.lg }}>{sendError}</Text>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("Xabar yozing…")}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={1000}
            style={{
              flex: 1,
              maxHeight: 110,
              minHeight: 44,
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 22,
              paddingHorizontal: spacing.lg,
              paddingTop: 12,
              paddingBottom: 10,
              color: colors.text,
              fontSize: 15,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yuborish"
            disabled={!text.trim()}
            onPress={send}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: text.trim() ? 1 : 0.4,
            }}
          >
            <Ionicons name="send" size={20} color={colors.primaryText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
