import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatView } from '@/components/ChatView';
import { AsyncView } from '@/components/StateView';
import { Text } from '@/components/Text';
import { useFetch } from '@/lib/hooks';
import { timeAgo } from '@/lib/format';
import type { Me } from '@/lib/types';
import { useTheme } from '@/theme';

type Tab = 'mahalla' | 'admin';

const TABS: Array<{ id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'mahalla', label: 'Mahalla chati', icon: 'people' },
  { id: 'admin', label: 'Admin bilan', icon: 'shield-checkmark' },
];

interface Thread {
  residentId: string;
  residentName: string;
  lastText: string;
  lastAt: string;
  awaitingReply: boolean;
}

/** Admin uchun: aholi suhbatlari ro'yxati -> tanlangan aholi bilan shaxsiy chat. */
function AdminSupport() {
  const { colors, spacing, radius } = useTheme();
  const threads = useFetch<{ items: Thread[] }>('/admin/support/threads');
  const [selected, setSelected] = useState<Thread | null>(null);
  const { refresh } = threads;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (selected) {
    return (
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={() => setSelected(null)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.md }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text variant="label" style={{ color: colors.primary }}>
            {selected.residentName}
          </Text>
        </Pressable>
        <ChatView
          key={selected.residentId}
          base={`/admin/support/threads/${selected.residentId}/messages`}
          hint={`${selected.residentName} bilan shaxsiy suhbat.`}
          emptyTitle="Xabar yo'q"
          emptyHint="Javobingizni yozing."
        />
      </View>
    );
  }

  return (
    <AsyncView data={threads.data} loading={threads.loading} error={threads.error} onRetry={() => void refresh()}>
      {(d) => (
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
          {d.items.length === 0 ? <Text variant="muted">Hozircha suhbat yo&apos;q. Aholi yozganda shu yerda ko&apos;rinadi.</Text> : null}
          {d.items.map((th) => (
            <Pressable
              key={th.residentId}
              onPress={() => setSelected(th)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                padding: spacing.md,
                gap: 2,
                borderWidth: th.awaitingReply ? 1.5 : 0,
                borderColor: colors.primary,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="label" raw>
                  {th.residentName}
                </Text>
                <Text variant="muted">{timeAgo(th.lastAt)}</Text>
              </View>
              <Text variant="muted" numberOfLines={1}>
                {th.awaitingReply ? 'Javob kutmoqda · ' : ''}
                {th.lastText}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </AsyncView>
  );
}

// Mahalla chati: GET/POST /chat/messages (umumiy kanal) · Admin bilan: GET/POST /support/messages (shaxsiy suhbat)
export default function ChatScreen() {
  const { colors, spacing, radius } = useTheme();
  const [tab, setTab] = useState<Tab>('mahalla');
  const me = useFetch<Me>('/me');
  const isAdmin = me.data?.role === 'MAHALLA_ADMIN';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <View
        style={{
          flexDirection: 'row',
          margin: spacing.md,
          marginBottom: 0,
          padding: 4,
          gap: 4,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
        }}
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(t.id)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 9,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.primary : 'transparent',
              }}
            >
              <Ionicons name={t.icon} size={16} color={active ? colors.primaryText : colors.muted} />
              <Text variant="label" style={{ color: active ? colors.primaryText : colors.muted }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'mahalla' ? (
        <ChatView
          key="mahalla"
          base="/chat/messages"
          hint="Mahalla aholisi va admin ishtirok etadigan umumiy chat."
          emptyTitle="Hali xabar yo'q"
          emptyHint="Birinchi bo'lib qo'shnilarga salom yozing."
        />
      ) : isAdmin ? (
        <AdminSupport />
      ) : (
        <ChatView
          key="admin"
          base="/support/messages"
          hint="Shaxsiy suhbat: faqat siz va mahalla admini ko'radi. Savol yoki taklifingizni yozing."
          emptyTitle="Adminga yozing"
          emptyHint="Savol yoki taklifingizni yuboring — admin shu yerda javob beradi."
        />
      )}
    </SafeAreaView>
  );
}
