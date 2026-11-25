import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chips } from '@/components/Chips';
import { Select } from '@/components/Select';
import { EmptyState } from '@/components/EmptyState';
import { MyVotes } from '@/components/MyVotes';
import { IssueCard } from '@/components/IssueCard';
import { PressableScale } from '@/components/PressableScale';
import { ErrorState, Loading } from '@/components/StateView';
import { Text } from '@/components/Text';
import { timeLeft } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { errorMessage, useFetch, usePaged } from '@/lib/hooks';
import { CATEGORIES, ISSUE_STATUS_LABELS } from '@/lib/labels';
import { roundOf, type CurrentRound, type IssueListItem, type RoundKind, type RoundState } from '@/lib/types';
import { ADMIN_READONLY_HINT, useRole } from '@/lib/role';
import { isStaleVoteError, toggleVote } from '@/lib/vote';
import { useTheme } from '@/theme';

const STATUS_FILTERS = ['OPEN', 'SELECTED', 'IN_PROGRESS', 'REFERRED', 'RESOLVED'].map((value) => ({
  value,
  label: ISSUE_STATUS_LABELS[value] ?? value,
}));
const KINDS: Array<{ value: RoundKind; label: string }> = [
  { value: 'MONTHLY', label: 'Oylik' },
  { value: 'WEEKLY', label: 'Haftalik' },
];
const SORTS = [
  { value: 'newest', label: 'Eng yangi' },
  { value: 'top', label: "Eng ko'p ovoz" },
];

// API: GET /issues?roundKind&sort&category&status&period=current  ·  PUT/DELETE /issues/:id/vote  ·  GET /rounds/current
export default function FeedScreen() {
  const router = useRouter();
  const { colors, spacing, radius, shadow } = useTheme();
  // Oylik va haftalik davrlar parallel: lenta va ovoz bloki tanlangan turni ko'rsatadi
  const [kind, setKind] = useState<RoundKind>('MONTHLY');
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sort, setSort] = useState<string | null>('newest');
  const [currentOnly, setCurrentOnly] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const q = new URLSearchParams({ sort: sort ?? 'newest', roundKind: kind });
  if (category) q.set('category', category);
  if (status) q.set('status', status);
  if (currentOnly) q.set('period', 'current');
  const list = usePaged<IssueListItem>(`/issues?${q.toString()}`);
  const round = useFetch<CurrentRound>('/rounds/current');
  const { isAdmin } = useRole();

  const { refresh: refreshList } = list;
  const { refresh: refreshRound } = round;
  useFocusEffect(
    useCallback(() => {
      void refreshList();
      void refreshRound();
    }, [refreshList, refreshRound]),
  );

  const r = roundOf(round.data, kind);
  const exhausted = r !== null && r.round !== null && r.votesLeft <= 0;
  const weekly = kind === 'WEEKLY';

  /** Tanlangan turdagi davr holatini yangilaydi (oylik — yuqori daraja, haftalik — `weekly`). */
  const patchRound = (k: RoundKind, fn: (s: RoundState) => RoundState) =>
    round.setData((p) => (p === null ? p : k === 'WEEKLY' ? (p.weekly ? { ...p, weekly: fn(p.weekly) } : p) : { ...p, ...fn(p) }));

  // Optimistik: kartochka darhol o'zgaradi, server rad etsa — avvalgi holatga qaytadi
  async function onVote(issue: IssueListItem) {
    setNotice(null);
    const issueKind: RoundKind = issue.roundKind === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY';
    const st = roundOf(round.data, issueKind);
    if (!issue.myVote && st !== null && st.round !== null && st.votesLeft <= 0) {
      haptic.warning();
      setNotice(
        issueKind === 'WEEKLY'
          ? 'Bu hafta 3 ta ovozingizni ishlatdingiz. Boshqasiga berish uchun bittasini qaytarib oling.'
          : 'Bu oy 3 ta ovozingizni ishlatdingiz. Boshqasiga berish uchun bittasini qaytarib oling.',
      );
      return;
    }
    const nowVoted = !issue.myVote;
    const patch = (voted: boolean, delta: number) =>
      list.setItems((prev) =>
        prev.map((i) => (i.id === issue.id ? { ...i, myVote: voted, voteCount: (i.voteCount ?? 0) + delta } : i)),
      );
    patch(nowVoted, nowVoted ? 1 : -1);
    // Optimistik: qolgan ovozlar va «siz ovoz bergan muammolar» ro'yxati darhol o'zgaradi
    patchRound(issueKind, (p) => ({
      ...p,
      votesUsed: p.votesUsed + (nowVoted ? 1 : -1),
      votesLeft: p.votesLeft + (nowVoted ? -1 : 1),
      myVotes: nowVoted
        ? [...p.myVotes, { issueId: issue.id, title: issue.title, slot: p.votesUsed + 1 }]
        : p.myVotes.filter((v) => v.issueId !== issue.id),
    }));
    setVotingId(issue.id);
    try {
      const { result } = await toggleVote(issue.id, issue.myVote);
      // Qolgan ovozlar va slotlar manbai — backend: javobdan keyin davr qayta o'qiladi
      if (result) patchRound(issueKind, (p) => ({ ...p, votesUsed: result.votesUsed, votesLeft: result.votesLeft }));
      void round.refresh();
    } catch (e) {
      haptic.error();
      patch(issue.myVote, nowVoted ? -1 : 1);
      void round.refresh();
      setNotice(errorMessage(e));
      if (isStaleVoteError(e)) void list.refresh();
    } finally {
      setVotingId(null);
    }
  }

  const activeFilters = (category ? 1 : 0) + (status ? 1 : 0);

  const header = (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.xs }}>
      <Chips options={KINDS} value={kind} onChange={(v) => setKind((v as RoundKind | null) ?? 'MONTHLY')} allowAll={false} />
      {/* Dizayn: to'q yashil tekis blok — qolgan ovozlar, 3 ta doira va qaysi muammolarga ovoz berilgani */}
      <View
        accessibilityRole="summary"
        style={{ backgroundColor: colors.primaryDark, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: 4 }}
      >
        {r && r.round ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text variant="eyebrow" style={{ color: colors.accent }}>
                  {weekly ? 'Haftalik ovozlaringiz' : 'Sizning ovozlaringiz'}
                </Text>
                <Text variant="title" style={{ color: colors.primaryText }}>
                  {r.votesLeft} ta qoldi
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`${r.votesUsed} ta ovoz berilgan`}>
                {[0, 1, 2].map((n) => {
                  const used = n < r.votesUsed;
                  return (
                    <View
                      key={n}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(251,246,235,0.35)',
                      }}
                    >
                      {/* Ishlatilgan ovoz «to'ladi»: yurak kattalashib chiqadi */}
                      {used ? (
                        <Animated.View
                          key={`used-${n}`}
                          entering={ZoomIn.springify().damping(12)}
                          style={{
                            position: 'absolute',
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: colors.primaryText,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="heart" size={15} color={colors.primaryDark} />
                        </Animated.View>
                      ) : (
                        <Ionicons name="heart-outline" size={14} color={colors.onHeroMuted} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
            <Text variant="muted" style={{ color: colors.onHeroMuted }}>
              {timeLeft(r.periodEnd)} qoldi{weekly ? " · g'olib 1 hafta ichida hal qilinadi" : ''}
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <MyVotes round={r} onHero />
            </View>
          </>
        ) : round.loading ? (
          <Text variant="muted" style={{ color: colors.primaryText }}>
            Ovoz davri yuklanmoqda…
          </Text>
        ) : (
          <Text variant="muted" style={{ color: colors.primaryText }}>
            {round.error ?? (weekly ? "Haftalik ovoz hali ishga tushmagan" : "Hozir faol ovoz berish davri yo'q")}
          </Text>
        )}
      </View>

      {isAdmin ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.infoSoft, borderRadius: radius.md, padding: spacing.md }}>
          <Ionicons name="shield-checkmark" size={20} color={colors.info} />
          <Text style={{ flex: 1, color: colors.text }}>{ADMIN_READONLY_HINT}</Text>
        </View>
      ) : null}

      {notice ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          accessibilityRole="alert"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.warningSoft,
            borderRadius: radius.md,
            padding: spacing.md,
          }}
        >
          <Ionicons name="information-circle" size={20} color={colors.warning} />
          <Text style={{ color: colors.text, flex: 1 }}>{notice}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Yopish" hitSlop={10} onPress={() => setNotice(null)}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </Animated.View>
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
            borderWidth: 1,
            borderColor: showFilters || activeFilters ? colors.primary : colors.border,
            backgroundColor: showFilters || activeFilters ? colors.primarySoft : colors.surface,
          }}
        >
          <Ionicons name="options-outline" size={16} color={colors.text} />
          <Text variant="label" style={{ color: colors.text }}>
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
            exhausted={exhausted}
            onVote={isAdmin ? undefined : (i) => void onVote(i)}
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
              actionTitle={isAdmin ? undefined : 'Muammo yuborish'}
              onAction={isAdmin ? undefined : () => router.push('/issues/new')}
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
      {isAdmin ? null : (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Muammo yuborish"
        onPress={() => router.push('/issues/new')}
        scaleTo={0.94}
        style={[
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
          },
          shadow.lg,
        ]}
      >
        <Ionicons name="add" size={22} color={colors.primaryText} />
        <Text variant="label" style={{ color: colors.primaryText, fontSize: 15 }}>
          Muammo yuborish
        </Text>
      </PressableScale>
      )}
    </SafeAreaView>
  );
}
