import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chips } from '@/components/Chips';
import { Select } from '@/components/Select';
import { EmptyState } from '@/components/EmptyState';
import { IssueCard } from '@/components/IssueCard';
import { ErrorState, Loading } from '@/components/StateView';
import { Text } from '@/components/Text';
import { ApiError, api } from '@/lib/api';
import { timeLeft } from '@/lib/format';
import { errorMessage, useFetch, usePaged } from '@/lib/hooks';
import { CATEGORIES, ISSUE_STATUS_LABELS } from '@/lib/labels';
import type { CurrentRound, IssueListItem, VoteResult } from '@/lib/types';
import { useTheme } from '@/theme';

const STATUS_FILTERS = ['OPEN', 'SELECTED', 'IN_PROGRESS', 'REFERRED', 'RESOLVED'].map((value) => ({
  value,
  label: ISSUE_STATUS_LABELS[value] ?? value,
}));
const SORTS = [
  { value: 'newest', label: 'Eng yangi' },
  { value: 'top', label: "Eng ko'p ovoz" },
];

// API: GET /issues?sort&category&status&period=current  ·  PUT/DELETE /issues/:id/vote  ·  GET /rounds/current
export default function FeedScreen() {
  const router = useRouter();
  const { colors, spacing, radius, shadow } = useTheme();
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sort, setSort] = useState<string | null>('newest');
  const [currentOnly, setCurrentOnly] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const q = new URLSearchParams({ sort: sort ?? 'newest' });
  if (category) q.set('category', category);
  if (status) q.set('status', status);
  if (currentOnly) q.set('period', 'current');
  const list = usePaged<IssueListItem>(`/issues?${q.toString()}`);
  const round = useFetch<CurrentRound>('/rounds/current');

  const { refresh: refreshList } = list;
  const { refresh: refreshRound } = round;
  useFocusEffect(
    useCallback(() => {
      void refreshList();
      void refreshRound();
    }, [refreshList, refreshRound]),
  );

  async function toggleVote(issue: IssueListItem) {
    setVotingId(issue.id);
    setNotice(null);
    try {
      const res = issue.myVote
        ? await api(`/issues/${issue.id}/vote`, { method: 'DELETE' }).then(() => null)
        : await api<VoteResult>(`/issues/${issue.id}/vote`, { method: 'PUT' });
      const nowVoted = !issue.myVote;
      list.setItems((prev) =>
        prev.map((i) =>
          i.id === issue.id
            ? { ...i, myVote: nowVoted, voteCount: (i.voteCount ?? 0) + (nowVoted ? 1 : -1) }
            : i,
        ),
      );
      // Qolgan ovozlar sonining manbai — backend; o'chirishda javob yo'q, shuning uchun qayta o'qiymiz
      if (res) round.setData((p) => (p ? { ...p, votesUsed: res.votesUsed, votesLeft: res.votesLeft } : p));
      else void round.refresh();
    } catch (e) {
      setNotice(errorMessage(e));
      if (e instanceof ApiError && ['ROUND_CLOSED', 'ISSUE_NOT_VOTABLE'].includes(e.code)) {
        void list.refresh();
        void round.refresh();
      }
    } finally {
      setVotingId(null);
    }
  }

  const r = round.data;
  const onGradient = 'rgba(255,255,255,0.8)';

  const activeFilters = (category ? 1 : 0) + (status ? 1 : 0);

  const header = (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.xs }}>
      <LinearGradient
        accessibilityRole="summary"
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: 4 }}
      >
        {r && r.round ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text variant="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Sizning ovozlaringiz
                </Text>
                <Text variant="heading" style={{ color: '#fff', fontSize: 20 }}>
                  {r.votesLeft} ta qoldi
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[0, 1, 2].map((n) => (
                  <View
                    key={n}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: n < r.votesUsed ? '#fff' : 'rgba(255,255,255,0.18)',
                    }}
                  >
                    <Ionicons
                      name={n < r.votesUsed ? 'checkmark' : 'thumbs-up-outline'}
                      size={16}
                      color={n < r.votesUsed ? colors.primaryDark : '#fff'}
                    />
                  </View>
                ))}
              </View>
            </View>
            <Text variant="muted" style={{ color: onGradient }}>
              <Ionicons name="time-outline" size={13} color={onGradient} /> {timeLeft(r.periodEnd)} qoldi
            </Text>
          </>
        ) : round.loading ? (
          <Text variant="muted" style={{ color: '#fff' }}>
            Ovoz davri yuklanmoqda…
          </Text>
        ) : (
          <Text variant="muted" style={{ color: '#fff' }}>
            {round.error ?? "Hozir faol ovoz berish davri yo'q"}
          </Text>
        )}
      </LinearGradient>

      {notice ? (
        <View
          accessibilityRole="alert"
          style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.md }}
        >
          <Text style={{ color: colors.danger }}>{notice}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Chips options={SORTS} value={sort} onChange={setSort} allowAll={false} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtr"
          onPress={() => setShowFilters((v) => !v)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            height: 36,
            paddingHorizontal: spacing.md,
            borderRadius: radius.pill,
            backgroundColor: showFilters || activeFilters ? colors.primarySoft : colors.surface,
          }}
        >
          <Ionicons name="options-outline" size={16} color={colors.primary} />
          <Text variant="label" style={{ color: colors.primary }}>
            Filtr{activeFilters ? ` · ${activeFilters}` : ''}
          </Text>
        </Pressable>
      </View>

      {showFilters ? (
        <>
          <Select label="Toifa" icon="grid-outline" iconTone="purple" options={CATEGORIES} value={category} onChange={setCategory} allowAll />
          <Select label="Holat" icon="flag-outline" iconTone="orange" options={STATUS_FILTERS} value={status} onChange={setStatus} allowAll />
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: currentOnly }}
            onPress={() => setCurrentOnly((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 }}
          >
            <Ionicons
              name={currentOnly ? 'checkbox' : 'square-outline'}
              size={22}
              color={currentOnly ? colors.primary : colors.muted}
            />
            <Text>Faqat joriy oy ovozidagilar</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <FlatList
        data={list.items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 96 }}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <IssueCard
            index={index}
            issue={item}
            voting={votingId === item.id}
            onVote={toggleVote}
            onPress={() => router.push(`/issues/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : (
            <EmptyState
              title="Muammolar topilmadi"
              hint="Filtrni o'zgartiring yoki birinchi bo'lib muammo yuboring."
              actionTitle="Muammo yuborish"
              onAction={() => router.push('/issues/new')}
            />
          )
        }
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} /> : undefined}
        onEndReached={() => void list.loadMore()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={list.refreshing}
            onRefresh={() => {
              void list.refresh();
              void round.refresh();
            }}
            tintColor={colors.primary}
          />
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Muammo yuborish"
        onPress={() => router.push('/issues/new')}
        style={({ pressed }) => [
          {
            position: 'absolute',
            right: spacing.lg,
            bottom: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 54,
            paddingHorizontal: spacing.xl,
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
          shadow.lg,
        ]}
      >
        <Ionicons name="add" size={22} color={colors.primaryText} />
        <Text variant="label" style={{ color: colors.primaryText, fontSize: 15, fontWeight: '700' }}>
          Muammo yuborish
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}
