import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { IssueJourney } from '@/components/IssueJourney';
import { KeyboardSpacer } from '@/components/KeyboardSpacer';
import { MediaGrid } from '@/components/MediaGrid';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { AsyncView } from '@/components/StateView';
import { StatusBadge, useStatusColors, WeeklyTag } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { VoteButton } from '@/components/VoteButton';
import { api } from '@/lib/api';
import { formatDateTime, formatDay, timeAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { errorMessage, useFetch, usePaged } from '@/lib/hooks';
import { useLang } from '@/lib/i18n';
import { CATEGORY_STYLE, ISSUE_STATUS_LABELS } from '@/lib/labels';
import { reportContent } from '@/lib/report';
import { roundOf, type Comment, type CurrentRound, type IssueDetail, type IssueHistoryItem, type Me, type RoundKind } from '@/lib/types';
import { isStaleVoteError, toggleVote } from '@/lib/vote';
import { fonts, useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Izoh yozish mumkin bo'lgan holatlar (backend PUBLIC_STATUSES) */
const COMMENTABLE = ['OPEN', 'SELECTED', 'IN_PROGRESS', 'REFERRED', 'RESOLVED'];

// API: GET /issues/:id · PUT/DELETE /issues/:id/vote · PUT/DELETE /issues/:id/follow · POST /issues/:id/feedback
//      GET/POST /issues/:id/comments · POST /reports · DELETE /issues/:id · GET /rounds/current
export default function IssueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const issue = useFetch<IssueDetail>(`/issues/${id}`);
  const me = useFetch<Me>('/me');
  const round = useFetch<CurrentRound>('/rounds/current');
  const comments = usePaged<Comment>(`/issues/${id}/comments`);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState<'CONFIRMED' | 'STILL_ONGOING' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const { refresh } = issue;
  const { refresh: refreshRound } = round;
  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshRound();
    }, [refresh, refreshRound]),
  );

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      haptic.error();
      setNotice(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  // Muammo o'z turidagi davrda ovozga chiqadi: qolgan ovozlar shu davrdan olinadi
  const issueKind: RoundKind = issue.data?.roundKind === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY';
  const st = roundOf(round.data, issueKind);
  const exhausted = st !== null && st.round !== null && st.votesLeft <= 0;
  const isAdmin = me.data?.role === 'MAHALLA_ADMIN';

  async function onVote(i: IssueDetail) {
    setNotice(null);
    if (!i.myVote && exhausted) {
      haptic.warning();
      setNotice(
        issueKind === 'WEEKLY'
          ? 'Bu hafta 3 ta ovozingizni ishlatdingiz. Boshqasiga berish uchun bittasini qaytarib oling.'
          : 'Bu oy 3 ta ovozingizni ishlatdingiz. Boshqasiga berish uchun bittasini qaytarib oling.',
      );
      return;
    }
    const nowVoted = !i.myVote;
    // Optimistik: darhol ko'rsatamiz, xato bo'lsa qaytaramiz. Ovoz qaytarilsa tugma ochiq qolishi uchun canVote ham yangilanadi
    // (server canVote=false qaytaradi, agar allaqachon ovoz berilgan bo'lsa).
    issue.setData((p) =>
      p ? { ...p, myVote: nowVoted, canVote: !nowVoted, voteCount: (p.voteCount ?? 0) + (nowVoted ? 1 : -1) } : p,
    );
    setBusy('vote');
    try {
      await toggleVote(i.id, i.myVote);
      // Manba — backend: qolgan ovozlar, «siz ovoz bergan muammolar» va canVote qayta o'qiladi
      void round.refresh();
      void issue.refresh();
    } catch (e) {
      haptic.error();
      issue.setData((p) => (p ? { ...p, myVote: i.myVote, canVote: i.canVote, voteCount: i.voteCount } : p));
      setNotice(errorMessage(e));
      if (isStaleVoteError(e)) {
        void issue.refresh();
        void round.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  const toggleFollow = (i: IssueDetail) =>
    run('follow', async () => {
      await api(`/issues/${i.id}/follow`, { method: i.isFollowing ? 'DELETE' : 'PUT' });
      haptic.success();
      issue.setData((p) => (p ? { ...p, isFollowing: !i.isFollowing } : p));
    });

  const sendFeedback = () =>
    run('feedback', async () => {
      await api(`/issues/${id}/feedback`, {
        method: 'POST',
        json: { type: feedbackOpen, comment: feedbackText.trim() },
      });
      haptic.success();
      setFeedbackOpen(null);
      setFeedbackText('');
      Alert.alert('Rahmat', 'Fikringiz adminga yuborildi.');
      await issue.refresh();
    });

  const remove = (i: IssueDetail) =>
    Alert.alert("Muammoni o'chirish", "Bu amalni qaytarib bo'lmaydi.", [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: () =>
          void run('delete', async () => {
            await api(`/issues/${i.id}`, { method: 'DELETE' });
            router.back();
          }),
      },
    ]);

  const i0 = issue.data;
  const canComment = i0 !== null && COMMENTABLE.includes(i0.status) && !i0.hidden;

  return (
    <Screen
      onRefresh={() => {
        void issue.refresh();
        void comments.refresh();
        void round.refresh();
      }}
      refreshing={issue.refreshing}
      footer={
        canComment ? (
          <CommentComposer
            issueId={id}
            onSent={(c) => {
              comments.setItems((prev) => [...prev, c]);
              issue.setData((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
            }}
          />
        ) : undefined
      }
    >
      <Stack.Screen
        options={{
          title: 'Muammo',
          headerRight: i0
            ? () => (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={i0.isFollowing ? 'Kuzatishni bekor qilish' : 'Kuzatish'}
                  onPress={() => void toggleFollow(i0)}
                  disabled={busy === 'follow'}
                  hitSlop={8}
                  style={{ padding: 4 }}
                >
                  <Ionicons name={i0.isFollowing ? 'eye' : 'eye-outline'} size={24} color={colors.primary} />
                </PressableScale>
              )
            : undefined,
        }}
      />
      <AsyncView data={issue.data} loading={issue.loading} error={issue.error} onRetry={issue.reload}>
        {(i) => {
          const mine = me.data?.user.id === i.author.id;
          const editable = mine && (i.status === 'PENDING_REVIEW' || i.status === 'REJECTED');
          const hasWork =
            i.responsible || i.nextStep || i.dueDate || i.referredOrg || i.referredAt || i.followUpAt;
          const cat = CATEGORY_STYLE[i.category] ?? CATEGORY_STYLE.OTHER;
          return (
            <>
              {/* Dizayn: avval rasm, keyin sarlavha, holat va qisqa meta qator */}
              <MediaGrid media={i.media} />
              <Animated.View entering={FadeInDown.duration(350)} style={{ gap: spacing.sm }}>
                <Text variant="title" raw>
                  {i.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <StatusBadge status={i.status} label={i.statusLabel} />
                  {i.roundKind === 'WEEKLY' ? <WeeklyTag /> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={cat?.icon as IconName} size={14} color={colors.muted} />
                  <Text variant="muted">
                    {i.categoryLabel}
                    {i.voteCount !== null ? ` · ${i.voteCount} ovoz` : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Avatar name={i.author.displayName} size={26} />
                  <Text variant="label" raw>
                    {i.author.displayName}
                  </Text>
                  <Text variant="muted">· {timeAgo(i.publishedAt ?? i.createdAt)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="location-outline" size={15} color={colors.muted} />
                  <Text variant="muted" style={{ flex: 1 }} raw>
                    {i.locationText}
                  </Text>
                </View>
              </Animated.View>

              {notice ? (
                <Animated.View
                  entering={FadeIn}
                  accessibilityRole="alert"
                  style={{ flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: spacing.md }}
                >
                  <Ionicons name="information-circle" size={20} color={colors.warning} />
                  <Text style={{ flex: 1 }}>{notice}</Text>
                </Animated.View>
              ) : null}

              {i.status === 'REJECTED' && i.rejectedReason ? (
                <Card title="Tuzatish kerak" icon="alert-circle-outline">
                  <Text raw>{i.rejectedReason}</Text>
                  {mine ? (
                    <Button title="Tuzatib qayta yuborish" icon="create-outline" onPress={() => router.push(`/issues/${i.id}/edit`)} />
                  ) : null}
                </Card>
              ) : null}

              {i.duplicateOf ? (
                <Card title="Bu muammo birlashtirildi" icon="git-merge-outline">
                  <Text>
                    Asosiy post: «<Text raw>{i.duplicateOf.title}</Text>». Ovoz berish va kuzatish o&apos;sha yerda.
                  </Text>
                  <Button
                    title="Asosiy postga o'tish"
                    variant="secondary"
                    onPress={() => router.push(`/issues/${i.duplicateOf?.id}`)}
                  />
                </Card>
              ) : null}

              <Text raw>
                {i.description}
              </Text>

              <Card title="Muammo yo‘li" icon="git-commit-outline">
                <IssueJourney status={i.status} />
                {i.status === 'PENDING_REVIEW' ? (
                  <Text variant="muted">Moderator ko&apos;rib chiqmoqda. Tasdiqlangach ovozga chiqadi.</Text>
                ) : null}
              </Card>

              {/* Ovoz berish */}
              {i.voteCount !== null ? (
                <VoteCard
                  issue={i}
                  busy={busy === 'vote'}
                  exhausted={exhausted && !i.myVote}
                  votesLeft={st?.round ? st.votesLeft : null}
                  readOnly={isAdmin}
                  onVote={() => void onVote(i)}
                />
              ) : null}

              {hasWork ? (
                <Card title="Ish rejasi" icon="clipboard-outline">
                  {i.responsible ? <Row icon="person-outline" label="Mas'ul" value={i.responsible} /> : null}
                  {i.nextStep ? <Row icon="arrow-forward-circle-outline" label="Keyingi qadam" value={i.nextStep} /> : null}
                  {i.dueDate ? <Row icon="calendar-outline" label="Muddat" value={formatDay(i.dueDate)} /> : null}
                  {i.referredOrg ? <Row icon="business-outline" label="Tashkilot" value={i.referredOrg} /> : null}
                  {i.referredAt ? <Row icon="paper-plane-outline" label="Yuborilgan sana" value={formatDay(i.referredAt)} /> : null}
                  {i.followUpAt ? <Row icon="alarm-outline" label="Keyingi tekshiruv" value={formatDay(i.followUpAt)} /> : null}
                </Card>
              ) : null}

              {i.resolutionText ? (
                <Card title="Bajarilgan ish" icon="checkmark-done-outline">
                  <Text raw>{i.resolutionText}</Text>
                </Card>
              ) : null}

              {mine && i.status === 'RESOLVED' ? (
                <Card title="Natija sizni qoniqtirdimi?" icon="happy-outline">
                  {feedbackOpen === null ? (
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        <Button title="Ha, hal bo'ldi" icon="thumbs-up-outline" onPress={() => setFeedbackOpen('CONFIRMED')} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button title="Muammo davom etmoqda" variant="secondary" onPress={() => setFeedbackOpen('STILL_ONGOING')} />
                      </View>
                    </View>
                  ) : (
                    <View style={{ gap: spacing.sm }}>
                      <Field
                        label={feedbackOpen === 'CONFIRMED' ? 'Izoh' : 'Nima davom etmoqda? (dalil/izoh)'}
                        value={feedbackText}
                        onChangeText={setFeedbackText}
                        multiline
                        maxLength={1000}
                        hint="3–1000 belgi"
                      />
                      <Button
                        title="Yuborish"
                        onPress={() => void sendFeedback()}
                        loading={busy === 'feedback'}
                        disabled={feedbackText.trim().length < 3}
                      />
                      <Button title="Bekor qilish" variant="ghost" onPress={() => setFeedbackOpen(null)} />
                    </View>
                  )}
                </Card>
              ) : null}

              {editable ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Button title="Tahrirlash" icon="create-outline" variant="secondary" onPress={() => router.push(`/issues/${i.id}/edit`)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="O'chirish" icon="trash-outline" variant="danger" onPress={() => remove(i)} />
                  </View>
                </View>
              ) : null}

              {i.history.length > 0 ? (
                <Card title="Holat tarixi" icon="time-outline">
                  {[...i.history].reverse().map((h, idx, arr) => (
                    <HistoryRow key={h.id} item={h} last={idx === arr.length - 1} />
                  ))}
                </Card>
              ) : null}

              <Card title={`Izohlar (${i.commentCount})`} icon="chatbubbles-outline">
                {comments.items.map((c) => (
                  <CommentRow key={c.id} comment={c} mine={c.authorId === me.data?.user.id} />
                ))}
                {comments.loading ? <ActivityIndicator color={colors.primary} /> : null}
                {comments.error ? <Text variant="muted">{comments.error}</Text> : null}
                {!comments.loading && comments.items.length === 0 ? (
                  <Text variant="muted">
                    {canComment ? "Birinchi bo'lib fikr bildiring." : "Hali izoh yo'q."}
                  </Text>
                ) : null}
                {comments.hasMore ? (
                  <Button
                    title="Yana izohlar"
                    variant="ghost"
                    loading={comments.loadingMore}
                    onPress={() => void comments.loadMore()}
                  />
                ) : null}
              </Card>

              {!mine ? (
                <Button
                  title="Postdan shikoyat qilish"
                  icon="flag-outline"
                  variant="ghost"
                  onPress={() => reportContent('POST', i.id)}
                />
              ) : null}
            </>
          );
        }}
      </AsyncView>
    </Screen>
  );
}

function VoteCard({
  issue,
  busy,
  exhausted,
  votesLeft,
  readOnly,
  onVote,
}: {
  issue: IssueDetail;
  busy: boolean;
  exhausted: boolean;
  votesLeft: number | null;
  /** Admin: faqat ovozlar soni ko'rinadi */
  readOnly: boolean;
  onVote: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const open = !readOnly && (issue.canVote || issue.myVote);
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 5,
            borderColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.Text key={issue.voteCount} entering={FadeIn.duration(250)} style={{ fontSize: 26, fontFamily: fonts.serif, color: colors.primary }}>
            {issue.voteCount}
          </Animated.Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="eyebrow">
            {open ? (issue.roundKind === 'WEEKLY' ? 'Haftalik ovoz' : 'Ovoz berish') : readOnly ? 'Ovozlar' : 'Ovoz berish yopiq'}
          </Text>
          <Text variant="heading">
            {issue.myVote
              ? 'Ovozingiz qabul qilindi'
              : votesLeft !== null && open
                ? `${votesLeft} ta ovoz qoldi`
                : `${issue.voteCount ?? 0} ovoz`}
          </Text>
        </View>
      </View>
      {open ? (
        <VoteButton voted={issue.myVote} count={null} busy={busy} exhausted={exhausted} onPress={onVote} size="lg" />
      ) : null}
    </View>
  );
}

/** Pastki izoh paneli: doim ko'rinadi va klaviatura bilan birga ko'tariladi (chat kabi). */
function CommentComposer({ issueId, onSent }: { issueId: string; onSent: (c: Comment) => void }) {
  const { colors, spacing } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = text.trim().length > 0 && !sending;

  async function send() {
    const value = text.trim();
    if (!value) return;
    setSending(true);
    setError(null);
    try {
      const c = await api<Comment>(`/issues/${issueId}/comments`, { method: 'POST', json: { text: value } });
      haptic.success();
      setText('');
      onSent(c);
    } catch (e) {
      haptic.error();
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
      {error ? (
        <Text variant="muted" style={{ color: colors.danger, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          {error}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('Izoh yozing…')}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={1000}
          editable={!sending}
          style={{
            flex: 1,
            maxHeight: 120,
            minHeight: 44,
            fontFamily: fonts.regular,
            fontSize: 15,
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 22,
            paddingHorizontal: spacing.lg,
            paddingTop: 12,
            paddingBottom: 10,
            color: colors.text,
          }}
        />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Yuborish"
          disabled={!ready}
          onPress={() => void send()}
          scaleTo={0.9}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: ready || sending ? 1 : 0.4,
          }}
        >
          {sending ? <ActivityIndicator color={colors.primaryText} /> : <Ionicons name="arrow-up" size={22} color={colors.primaryText} />}
        </PressableScale>
      </View>
      <KeyboardSpacer offset={insets.bottom} />
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const { tones } = useTheme();
  // Ism bo'yicha doimiy rang: bir odam har doim bir xil rangda
  const keys = ['blue', 'orange', 'green', 'purple', 'rose', 'teal'] as const;
  const tone = tones[keys[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % keys.length] ?? 'blue'];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone.soft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text raw style={{ color: tone.fg, fontWeight: '700', fontSize: size * 0.4, lineHeight: size * 0.5 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

function CommentRow({ comment: c, mine }: { comment: Comment; mine: boolean }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(280)} style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: 6 }}>
      <Avatar name={c.authorName} />
      <View style={{ flex: 1, gap: 4 }}>
        <View
          style={{
            backgroundColor: mine ? colors.primarySoft : colors.surfaceAlt,
            borderRadius: radius.md,
            borderTopLeftRadius: 4,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            gap: 2,
          }}
        >
          <Text variant="label" raw>
            {c.authorName}
          </Text>
          <Text raw>{c.text}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: 4 }}>
          <Text variant="muted" style={{ fontSize: 12 }}>
            {timeAgo(c.createdAt)}
          </Text>
          {!mine ? (
            <Text
              variant="muted"
              accessibilityRole="button"
              accessibilityLabel="Izoh ustidan shikoyat"
              onPress={() => reportContent('COMMENT', c.id)}
              style={{ fontSize: 12, fontWeight: '600' }}
            >
              Shikoyat
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

function Row({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingVertical: 4 }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="muted">{label}</Text>
        <Text raw>{value}</Text>
      </View>
    </View>
  );
}

function HistoryRow({ item, last }: { item: IssueHistoryItem; last: boolean }) {
  const { colors } = useTheme();
  const { t } = useLang();
  const c = useStatusColors(item.toStatus ?? '');
  // Har bir yorliq alohida tarjima qilinadi: «A → B» butun holda lug'atda yo'q
  const from = item.fromStatus ? t(ISSUE_STATUS_LABELS[item.fromStatus] ?? item.fromStatus) : null;
  const to = item.toStatus ? t(ISSUE_STATUS_LABELS[item.toStatus] ?? item.toStatus) : null;
  const feedback = (item.payload as { feedback?: string }).feedback;
  const title =
    item.type === 'STATUS_CHANGE'
      ? from && to
        ? `${from} → ${to}`
        : (to ?? 'Holat o‘zgardi')
      : item.type === 'AUTHOR_FEEDBACK'
        ? feedback === 'CONFIRMED'
          ? 'Muallif natijani tasdiqladi'
          : 'Muallif: muammo davom etmoqda'
        : item.type === 'CARRY_OVER'
          ? 'Keyingi davrga o‘tkazildi'
          : 'Ma’lumotlar yangilandi';
  const color = item.toStatus ? c.fg : colors.muted;
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {/* Vertikal vaqt chizig'i */}
      <View style={{ alignItems: 'center', width: 22 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: item.toStatus ? c.soft : colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          <Ionicons name={item.toStatus ? c.icon : 'create-outline'} size={12} color={color} />
        </View>
        {!last ? <View style={{ flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 3, paddingBottom: last ? 0 : 14 }}>
        <Text variant="label">{title}</Text>
        {item.reason ? <Text raw>{item.reason}</Text> : null}
        <MediaGrid media={item.media} />
        <Text variant="muted" style={{ fontSize: 12 }}>
          {formatDateTime(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}
