import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { MediaGrid } from '@/components/MediaGrid';
import { Screen } from '@/components/Screen';
import { AsyncView } from '@/components/StateView';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import { formatDateTime, formatDay, timeAgo } from '@/lib/format';
import { errorMessage, useFetch, usePaged } from '@/lib/hooks';
import { ISSUE_STATUS_LABELS } from '@/lib/labels';
import { reportContent } from '@/lib/report';
import type { Comment, IssueDetail, IssueHistoryItem, Me, VoteResult } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /issues/:id · PUT/DELETE /issues/:id/vote · PUT/DELETE /issues/:id/follow · POST /issues/:id/feedback
//      GET/POST /issues/:id/comments · POST /reports · DELETE /issues/:id
export default function IssueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const issue = useFetch<IssueDetail>(`/issues/${id}`);
  const me = useFetch<Me>('/me');
  const comments = usePaged<Comment>(`/issues/${id}/comments`);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState<'CONFIRMED' | 'STILL_ONGOING' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const { refresh } = issue;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const toggleVote = (i: IssueDetail) =>
    run('vote', async () => {
      const nowVoted = !i.myVote;
      if (i.myVote) await api(`/issues/${i.id}/vote`, { method: 'DELETE' });
      else await api<VoteResult>(`/issues/${i.id}/vote`, { method: 'PUT' });
      // Holat darhol o'zgaradi (javob kutmasdan), keyin serverdan aniqlanadi
      issue.setData((p) =>
        p ? { ...p, myVote: nowVoted, voteCount: (p.voteCount ?? 0) + (nowVoted ? 1 : -1) } : p,
      );
      await issue.refresh();
    });

  const toggleFollow = (i: IssueDetail) =>
    run('follow', async () => {
      await api(`/issues/${i.id}/follow`, { method: i.isFollowing ? 'DELETE' : 'PUT' });
      issue.setData((p) => (p ? { ...p, isFollowing: !i.isFollowing } : p));
    });

  const sendComment = () =>
    run('comment', async () => {
      const c = await api<Comment>(`/issues/${id}/comments`, { method: 'POST', json: { text: commentText.trim() } });
      setCommentText('');
      comments.setItems((prev) => [...prev, c]);
      issue.setData((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
    });

  const sendFeedback = () =>
    run('feedback', async () => {
      await api(`/issues/${id}/feedback`, {
        method: 'POST',
        json: { type: feedbackOpen, comment: feedbackText.trim() },
      });
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

  return (
    <Screen onRefresh={() => void issue.refresh()} refreshing={issue.refreshing}>
      <Stack.Screen options={{ title: 'Muammo' }} />
      <AsyncView data={issue.data} loading={issue.loading} error={issue.error} onRetry={issue.reload}>
        {(i) => {
          const mine = me.data?.user.id === i.author.id;
          const editable = mine && (i.status === 'PENDING_REVIEW' || i.status === 'REJECTED');
          const canComment = !['PENDING_REVIEW', 'REJECTED', 'MERGED'].includes(i.status) && !i.hidden;
          const hasWork =
            i.responsible || i.nextStep || i.dueDate || i.referredOrg || i.referredAt || i.followUpAt;
          return (
            <>
              <View style={{ gap: spacing.sm }}>
                <Text variant="title">{i.title}</Text>
                <StatusBadge status={i.status} label={i.statusLabel} />
                <Text variant="muted">
                  {i.categoryLabel} · {i.locationText}
                </Text>
                <Text variant="muted">
                  {i.author.displayName} · {formatDateTime(i.publishedAt ?? i.createdAt)}
                </Text>
              </View>

              {notice ? (
                <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                  {notice}
                </Text>
              ) : null}

              {i.status === 'REJECTED' && i.rejectedReason ? (
                <Card title="Tuzatish kerak">
                  <Text>{i.rejectedReason}</Text>
                  {mine ? (
                    <Button title="Tuzatib qayta yuborish" onPress={() => router.push(`/issues/${i.id}/edit`)} />
                  ) : null}
                </Card>
              ) : null}

              {i.status === 'PENDING_REVIEW' && mine ? (
                <Card>
                  <Text variant="muted">Moderator ko&apos;rib chiqmoqda. Tasdiqlangach ovozga chiqadi.</Text>
                </Card>
              ) : null}

              {i.duplicateOf ? (
                <Card title="Bu muammo birlashtirildi">
                  <Text>Asosiy post: «{i.duplicateOf.title}». Ovoz berish va kuzatish o&apos;sha yerda.</Text>
                  <Button
                    title="Asosiy postga o'tish"
                    variant="secondary"
                    onPress={() => router.push(`/issues/${i.duplicateOf?.id}`)}
                  />
                </Card>
              ) : null}

              <MediaGrid media={i.media} />
              <Text>{i.description}</Text>

              {hasWork ? (
                <Card title="Ish rejasi">
                  {i.responsible ? <Row label="Mas'ul" value={i.responsible} /> : null}
                  {i.nextStep ? <Row label="Keyingi qadam" value={i.nextStep} /> : null}
                  {i.dueDate ? <Row label="Muddat" value={formatDay(i.dueDate)} /> : null}
                  {i.referredOrg ? <Row label="Tashkilot" value={i.referredOrg} /> : null}
                  {i.referredAt ? <Row label="Yuborilgan sana" value={formatDay(i.referredAt)} /> : null}
                  {i.followUpAt ? <Row label="Keyingi tekshiruv" value={formatDay(i.followUpAt)} /> : null}
                </Card>
              ) : null}

              {i.resolutionText ? (
                <Card title="Bajarilgan ish">
                  <Text>{i.resolutionText}</Text>
                </Card>
              ) : null}

              {mine && i.status === 'RESOLVED' ? (
                <Card title="Natija sizni qoniqtirdimi?">
                  {feedbackOpen === null ? (
                    <View style={{ gap: spacing.sm }}>
                      <Button title="Ha, hal bo'ldi" onPress={() => setFeedbackOpen('CONFIRMED')} />
                      <Button
                        title="Muammo davom etmoqda"
                        variant="secondary"
                        onPress={() => setFeedbackOpen('STILL_ONGOING')}
                      />
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
                      <Button title="Bekor qilish" variant="secondary" onPress={() => setFeedbackOpen(null)} />
                    </View>
                  )}
                </Card>
              ) : null}

              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="heading">
                    {i.voteCount !== null ? `${i.voteCount} ovoz` : 'Ovoz berish yopiq'}
                  </Text>
                  <Text variant="muted">{i.commentCount} izoh</Text>
                </View>
                {i.myVote ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      backgroundColor: colors.successSoft,
                      borderRadius: 12,
                      padding: spacing.md,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                    <Text style={{ color: colors.success, fontWeight: '700', flex: 1 }}>Ovoz berdingiz</Text>
                  </View>
                ) : null}
                {i.canVote || i.myVote ? (
                  <Button
                    title={i.myVote ? 'Ovozni qaytarib olish' : 'Ovoz berish'}
                    variant={i.myVote ? 'secondary' : 'primary'}
                    loading={busy === 'vote'}
                    disabled={!i.canVote && !i.myVote}
                    onPress={() => void toggleVote(i)}
                  />
                ) : null}
                <Button
                  title={i.isFollowing ? 'Kuzatishni bekor qilish' : 'Kuzatish'}
                  variant="secondary"
                  loading={busy === 'follow'}
                  onPress={() => void toggleFollow(i)}
                />
              </Card>

              {editable ? (
                <View style={{ gap: spacing.sm }}>
                  <Button title="Tahrirlash" variant="secondary" onPress={() => router.push(`/issues/${i.id}/edit`)} />
                  <Button title="O'chirish" variant="danger" onPress={() => remove(i)} />
                </View>
              ) : null}

              {i.history.length > 0 ? (
                <Card title="Holat tarixi">
                  {[...i.history].reverse().map((h) => (
                    <HistoryRow key={h.id} item={h} />
                  ))}
                </Card>
              ) : null}

              <Card title={`Izohlar (${i.commentCount})`}>
                {comments.items.map((c) => (
                  <View key={c.id} style={{ gap: 2, paddingVertical: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="label">{c.authorName}</Text>
                      {c.authorId !== me.data?.user.id ? (
                        <Text
                          variant="muted"
                          accessibilityRole="button"
                          accessibilityLabel="Izoh ustidan shikoyat"
                          onPress={() => reportContent('COMMENT', c.id)}
                          style={{ padding: 6 }}
                        >
                          Shikoyat
                        </Text>
                      ) : null}
                    </View>
                    <Text>{c.text}</Text>
                    <Text variant="muted">{timeAgo(c.createdAt)}</Text>
                  </View>
                ))}
                {comments.loading ? <Text variant="muted">Yuklanmoqda…</Text> : null}
                {comments.error ? <Text variant="muted">{comments.error}</Text> : null}
                {!comments.loading && comments.items.length === 0 ? (
                  <Text variant="muted">Hali izoh yo&apos;q.</Text>
                ) : null}
                {comments.hasMore ? (
                  <Button title="Yana izohlar" variant="secondary" onPress={() => void comments.loadMore()} />
                ) : null}
                {canComment ? (
                  <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
                    <Field
                      label="Izoh qoldiring"
                      value={commentText}
                      onChangeText={setCommentText}
                      multiline
                      maxLength={1000}
                    />
                    <Button
                      title="Yuborish"
                      loading={busy === 'comment'}
                      disabled={commentText.trim().length === 0}
                      onPress={() => void sendComment()}
                    />
                  </View>
                ) : null}
              </Card>

              {!mine ? (
                <Button title="Postdan shikoyat qilish" variant="secondary" onPress={() => reportContent('POST', i.id)} />
              ) : null}
            </>
          );
        }}
      </AsyncView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 1 }}>
      <Text variant="muted">{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function HistoryRow({ item }: { item: IssueHistoryItem }) {
  const { colors } = useTheme();
  const from = item.fromStatus ? (ISSUE_STATUS_LABELS[item.fromStatus] ?? item.fromStatus) : null;
  const to = item.toStatus ? (ISSUE_STATUS_LABELS[item.toStatus] ?? item.toStatus) : null;
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
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 4 }}>
      <Ionicons name="ellipse" size={10} color={colors.primary} style={{ marginTop: 6 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label">{title}</Text>
        {item.reason ? <Text>{item.reason}</Text> : null}
        <MediaGrid media={item.media} />
        <Text variant="muted">{formatDateTime(item.createdAt)}</Text>
      </View>
    </View>
  );
}
