import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { audit } from '../../core/audit';
import type { Queryable } from '../../core/db';
import { route } from '../../core/http';
import { uuidv7 } from '../../core/ids';
import { pageQuery } from '../../core/pagination';
import { idParam, isoDate, text, uuid } from '../../core/schemas';
import type { AuthUser, IssueStatus } from '../../core/types';
import { hideContent, unhideContent } from '../moderation/content';
import { currentRound, roundIsVotable } from '../rounds/service';
import { issueStatusEnum } from './enums';
import {
  PUBLIC_STATUSES,
  attachMedia,
  buildIssueDetail,
  listIssues,
  notifyIssueUpdate,
  recordUpdate,
  requireIssue,
  type IssueWithAuthor,
} from './service';
import { statusLabel } from './dto';
import { checkTransition } from './status-machine';

const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

/** Qatorni bloklab (FOR UPDATE) o'qiydi: bir vaqtda ikkita admin amali to'qnashmasin. */
async function lockIssue(q: Queryable, user: AuthUser, id: string): Promise<IssueWithAuthor> {
  const locked = await q.query('SELECT id FROM issues WHERE id = $1 AND mahalla_id = $2 AND deleted_at IS NULL FOR UPDATE', [
    id,
    user.mahallaId,
  ]);
  if (locked.rows.length === 0) throw new AppError('NOT_FOUND');
  return requireIssue(q, user.mahallaId, id);
}

const detailFor = async (deps: Parameters<typeof buildIssueDetail>[0], user: AuthUser, id: string, now: Date) => {
  const issue = await requireIssue(deps.db, user.mahallaId, id);
  return buildIssueDetail(deps, user, issue, 'full', now);
};

// ---------------------------------------------------------------- moderatsiya

const queue = route({
  method: 'get',
  path: '/admin/moderation/queue',
  auth: 'admin',
  tag: 'Admin: moderatsiya',
  summary: 'Moderatsiya navbati (PENDING_REVIEW, eskisi birinchi)',
  query: pageQuery,
  handler: ({ deps, user, query, now }) =>
    listIssues(deps, user, now, {
      scope: 'admin',
      status: 'PENDING_REVIEW',
      sort: 'newest',
      oldestFirst: true,
      cursor: query.cursor,
      limit: query.limit,
    }),
});

const approve = route({
  method: 'post',
  path: '/admin/issues/:id/approve',
  auth: 'admin',
  tag: 'Admin: moderatsiya',
  summary: "Tasdiqlash: OPEN, nashr sanasi qo'yiladi, joriy davrga qo'shiladi",
  params: idParam,
  handler: async ({ deps, user, params, now, req }) => {
    await deps.db.tx(async (q) => {
      const issue = await lockIssue(q, user, params.id);
      checkTransition({ from: issue.status, to: 'OPEN', actor: 'ADMIN', input: {} });
      const round = await currentRound(q, user.mahallaId, now, issue.round_kind);
      if (!roundIsVotable(round, now)) throw new AppError('ROUND_CLOSED');

      await q.query(`UPDATE issues SET status = 'OPEN', published_at = $2, updated_at = $2 WHERE id = $1`, [issue.id, now]);
      await q.query(
        `INSERT INTO round_entries (id, round_id, issue_id, added_by_id, added_at)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (round_id, issue_id) DO NOTHING`,
        [uuidv7(), round.id, issue.id, user.userId, now],
      );
      const updateId = await recordUpdate(q, {
        issueId: issue.id,
        actorId: user.userId,
        type: 'STATUS_CHANGE',
        from: 'PENDING_REVIEW',
        to: 'OPEN',
        payload: { roundId: round.id },
        now,
      });
      await notifyIssueUpdate(q, {
        issue,
        actorId: user.userId,
        authorType: 'ISSUE_STATUS_CHANGED',
        title: 'Muammo tasdiqlandi',
        body: `«${issue.title}» ovoz berishga qo'yildi`,
        updateId,
      });
      await audit(q, {
        mahallaId: user.mahallaId,
        actorId: user.userId,
        action: 'issue.approve',
        targetType: 'ISSUE',
        targetId: issue.id,
        ip: req.ip,
      });
    });
    return detailFor(deps, user, params.id, now);
  },
});

const reject = route({
  method: 'post',
  path: '/admin/issues/:id/reject',
  auth: 'admin',
  tag: 'Admin: moderatsiya',
  summary: "Rad etish (sabab majburiy, muallifga ko'rinadi)",
  params: idParam,
  body: z.object({ reason: text(3, 500) }),
  handler: async ({ deps, user, params, body, now, req }) => {
    await deps.db.tx(async (q) => {
      const issue = await lockIssue(q, user, params.id);
      checkTransition({ from: issue.status, to: 'REJECTED', actor: 'ADMIN', input: { reason: body.reason } });
      await q.query(`UPDATE issues SET status = 'REJECTED', rejected_reason = $2, updated_at = $3 WHERE id = $1`, [
        issue.id,
        body.reason,
        now,
      ]);
      const updateId = await recordUpdate(q, {
        issueId: issue.id,
        actorId: user.userId,
        type: 'STATUS_CHANGE',
        from: 'PENDING_REVIEW',
        to: 'REJECTED',
        reason: body.reason,
        now,
      });
      await notifyIssueUpdate(q, {
        issue,
        actorId: user.userId,
        authorType: 'ISSUE_REJECTED',
        title: 'Muammo rad etildi',
        body: `«${issue.title}»: ${body.reason}`,
        updateId,
      });
      await audit(q, {
        mahallaId: user.mahallaId,
        actorId: user.userId,
        action: 'issue.reject',
        targetType: 'ISSUE',
        targetId: issue.id,
        reason: body.reason,
        ip: req.ip,
      });
    });
    return detailFor(deps, user, params.id, now);
  },
});

const merge = route({
  method: 'post',
  path: '/admin/issues/:id/merge',
  auth: 'admin',
  tag: 'Admin: moderatsiya',
  summary: "Dublikat sifatida asosiy postga birlashtirish (muallif asosiy postni avtomatik kuzatadi)",
  params: idParam,
  body: z.object({ targetIssueId: uuid }),
  handler: async ({ deps, user, params, body, now, req }) => {
    if (body.targetIssueId === params.id) {
      throw new AppError('VALIDATION_ERROR', undefined, { fields: { targetIssueId: "O'zi bilan birlashtirib bo'lmaydi" } });
    }
    await deps.db.tx(async (q) => {
      const issue = await lockIssue(q, user, params.id);
      checkTransition({ from: issue.status, to: 'MERGED', actor: 'ADMIN', input: { targetIssueId: body.targetIssueId } });
      const target = await q.query<{ id: string; title: string; status: IssueStatus; hidden_at: Date | null }>(
        `SELECT id, title, status, hidden_at FROM issues WHERE id = $1 AND mahalla_id = $2 AND deleted_at IS NULL`,
        [body.targetIssueId, user.mahallaId],
      );
      const t = target.rows[0];
      if (!t || t.hidden_at || !(PUBLIC_STATUSES as readonly string[]).includes(t.status)) {
        throw new AppError('VALIDATION_ERROR', undefined, {
          fields: { targetIssueId: "Asosiy muammo topilmadi yoki ochiq holatda emas" },
        });
      }

      await q.query(`UPDATE issues SET status = 'MERGED', duplicate_of_id = $2, updated_at = $3 WHERE id = $1`, [
        issue.id,
        t.id,
        now,
      ]);
      await q.query(
        'INSERT INTO issue_follows (issue_id, user_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [t.id, issue.author_id, now],
      );
      const updateId = await recordUpdate(q, {
        issueId: issue.id,
        actorId: user.userId,
        type: 'STATUS_CHANGE',
        from: 'PENDING_REVIEW',
        to: 'MERGED',
        payload: { duplicateOf: { id: t.id, title: t.title } },
        now,
      });
      await notifyIssueUpdate(q, {
        issue,
        actorId: user.userId,
        authorType: 'ISSUE_STATUS_CHANGED',
        title: 'Muammo mavjud muammoga birlashtirildi',
        body: `«${issue.title}» → «${t.title}». Asosiy muammoni kuzatib borasiz`,
        updateId,
      });
      await audit(q, {
        mahallaId: user.mahallaId,
        actorId: user.userId,
        action: 'issue.merge',
        targetType: 'ISSUE',
        targetId: issue.id,
        meta: { targetIssueId: t.id },
        ip: req.ip,
      });
    });
    return detailFor(deps, user, params.id, now);
  },
});

// ---------------------------------------------------------------- ro'yxat va ish

const list = route({
  method: 'get',
  path: '/admin/issues',
  auth: 'admin',
  tag: 'Admin: muammolar',
  summary: "Barcha muammolar (holat va muddati o'tganlar bo'yicha filtr)",
  query: pageQuery.extend({
    status: issueStatusEnum.optional(),
    overdue: bool,
    sort: z.enum(['newest', 'top']).default('newest'),
  }),
  handler: ({ deps, user, query, now }) =>
    listIssues(deps, user, now, {
      scope: 'admin',
      status: query.status,
      overdue: query.overdue,
      sort: query.sort,
      cursor: query.cursor,
      limit: query.limit,
    }),
});

const detail = route({
  method: 'get',
  path: '/admin/issues/:id',
  auth: 'admin',
  tag: 'Admin: muammolar',
  summary: 'Muammo (admin ko\'rinishi: yashirilgan ham, tarix bilan)',
  params: idParam,
  handler: ({ deps, user, params, now }) => detailFor(deps, user, params.id, now),
});

const WORK_TARGETS = ['IN_PROGRESS', 'REFERRED', 'RESOLVED'] as const;

const transition = route({
  method: 'post',
  path: '/admin/issues/:id/transition',
  auth: 'admin',
  tag: 'Admin: muammolar',
  summary: "Holatni o'tkazish: IN_PROGRESS / REFERRED / RESOLVED (majburiy maydonlar holatga bog'liq)",
  description:
    "IN_PROGRESS: responsible, nextStep, dueDate. REFERRED: referredOrg, referredAt, followUpAt. RESOLVED: resolutionText (+ixtiyoriy mediaIds). " +
    "RESOLVED -> IN_PROGRESS: reason. Boshqa o'tish -> 409 INVALID_STATUS_TRANSITION.",
  params: idParam,
  body: z.object({
    toStatus: issueStatusEnum,
    reason: text(3, 500).optional(),
    responsible: text(2, 150).optional(),
    nextStep: text(3, 500).optional(),
    dueDate: isoDate.optional(),
    referredOrg: text(2, 200).optional(),
    referredAt: isoDate.optional(),
    followUpAt: isoDate.optional(),
    resolutionText: text(3, 2000).optional(),
    mediaIds: z.array(uuid).max(4).default([]),
  }),
  handler: async ({ deps, user, params, body, now, req }) => {
    await deps.db.tx(async (q) => {
      const issue = await lockIssue(q, user, params.id);
      const to = body.toStatus;
      // OPEN/REJECTED/MERGED/SELECTED o'z endpointlari yoki davr yopish orqali; bu yerda taqiqlangan
      if (!(WORK_TARGETS as readonly string[]).includes(to)) {
        throw new AppError('INVALID_STATUS_TRANSITION', `«${to}» holatiga bu endpoint orqali o'tib bo'lmaydi`, {
          from: issue.status,
          to,
        });
      }
      checkTransition({
        from: issue.status,
        to,
        actor: 'ADMIN',
        input: body,
        current: { responsible: issue.responsible, nextStep: issue.next_step, dueDate: issue.due_date },
      });

      await q.query(
        `UPDATE issues SET status = $2,
                responsible = COALESCE($3, responsible), next_step = COALESCE($4, next_step),
                due_date = COALESCE($5::date, due_date), referred_org = COALESCE($6, referred_org),
                referred_at = COALESCE($7::date, referred_at), follow_up_at = COALESCE($8::date, follow_up_at),
                resolution_text = COALESCE($9, resolution_text), updated_at = $10
          WHERE id = $1`,
        [
          issue.id,
          to,
          body.responsible ?? null,
          body.nextStep ?? null,
          body.dueDate ?? null,
          body.referredOrg ?? null,
          body.referredAt ?? null,
          body.followUpAt ?? null,
          body.resolutionText ?? null,
          now,
        ],
      );
      const payload = Object.fromEntries(
        Object.entries({
          responsible: body.responsible,
          nextStep: body.nextStep,
          dueDate: body.dueDate,
          referredOrg: body.referredOrg,
          referredAt: body.referredAt,
          followUpAt: body.followUpAt,
          resolutionText: body.resolutionText,
        }).filter(([, v]) => v !== undefined),
      );
      const updateId = await recordUpdate(q, {
        issueId: issue.id,
        actorId: user.userId,
        type: 'STATUS_CHANGE',
        from: issue.status,
        to,
        reason: body.reason ?? null,
        payload,
        now,
      });
      await attachMedia(q, {
        mediaIds: body.mediaIds,
        ownerId: user.userId,
        mahallaId: user.mahallaId,
        target: { issueUpdateId: updateId },
        maxImages: 3,
        maxVideos: 1,
      });
      await notifyIssueUpdate(q, {
        issue,
        actorId: user.userId,
        authorType: 'ISSUE_STATUS_CHANGED',
        title: 'Muammo holati yangilandi',
        body: `«${issue.title}»: ${statusLabel(to, false)}`,
        updateId,
      });
      await audit(q, {
        mahallaId: user.mahallaId,
        actorId: user.userId,
        action: 'issue.transition',
        targetType: 'ISSUE',
        targetId: issue.id,
        reason: body.reason ?? null,
        meta: { from: issue.status, to, ...payload },
        ip: req.ip,
      });
    });
    return detailFor(deps, user, params.id, now);
  },
});

const work = route({
  method: 'patch',
  path: '/admin/issues/:id/work',
  auth: 'admin',
  tag: 'Admin: muammolar',
  summary: "Mas'ul/qadam/muddatni o'zgartirish (holat o'zgarmaydi; sabab majburiy, tarixga yoziladi)",
  params: idParam,
  body: z
    .object({
      responsible: text(2, 150).optional(),
      nextStep: text(3, 500).optional(),
      dueDate: isoDate.optional(),
      reason: text(3, 500),
    })
    .refine((b) => b.responsible !== undefined || b.nextStep !== undefined || b.dueDate !== undefined, {
      message: "Kamida bitta maydon (mas'ul, qadam yoki muddat) kerak",
      path: ['responsible'],
    }),
  handler: async ({ deps, user, params, body, now, req }) => {
    await deps.db.tx(async (q) => {
      const issue = await lockIssue(q, user, params.id);
      if (!['SELECTED', 'IN_PROGRESS', 'REFERRED'].includes(issue.status)) {
        throw new AppError('CONFLICT', "Bu holatdagi muammoning ish ma'lumotlarini o'zgartirib bo'lmaydi");
      }
      const before = { responsible: issue.responsible, nextStep: issue.next_step, dueDate: issue.due_date };
      await q.query(
        `UPDATE issues SET responsible = COALESCE($2, responsible), next_step = COALESCE($3, next_step),
                due_date = COALESCE($4::date, due_date), updated_at = $5 WHERE id = $1`,
        [issue.id, body.responsible ?? null, body.nextStep ?? null, body.dueDate ?? null, now],
      );
      const after = {
        responsible: body.responsible ?? issue.responsible,
        nextStep: body.nextStep ?? issue.next_step,
        dueDate: body.dueDate ?? issue.due_date,
      };
      const updateId = await recordUpdate(q, {
        issueId: issue.id,
        actorId: user.userId,
        type: 'DETAILS_CHANGE',
        reason: body.reason,
        payload: { before, after },
        now,
      });
      await notifyIssueUpdate(q, {
        issue,
        actorId: user.userId,
        authorType: 'ISSUE_STATUS_CHANGED',
        title: "Ish ma'lumotlari yangilandi",
        body: `«${issue.title}»: ${body.reason}`,
        updateId,
      });
      await audit(q, {
        mahallaId: user.mahallaId,
        actorId: user.userId,
        action: 'issue.work_update',
        targetType: 'ISSUE',
        targetId: issue.id,
        reason: body.reason,
        meta: { before, after },
        ip: req.ip,
      });
    });
    return detailFor(deps, user, params.id, now);
  },
});

const carryOver = route({
  method: 'post',
  path: '/admin/issues/:id/carry-over',
  auth: 'admin',
  tag: 'Admin: muammolar',
  summary: "G'olib bo'lmagan ochiq muammoni joriy davrga 0 ovoz bilan o'tkazish",
  params: idParam,
  handler: async ({ deps, user, params, now, req }) => {
    await deps.db.tx(async (q) => {
      const issue = await lockIssue(q, user, params.id);
      if (issue.status !== 'OPEN' || issue.hidden_at) {
        throw new AppError('CONFLICT', "Faqat ochiq (OPEN) muammoni keyingi davrga o'tkazish mumkin");
      }
      const round = await currentRound(q, user.mahallaId, now, issue.round_kind);
      if (!roundIsVotable(round, now)) throw new AppError('ROUND_CLOSED');

      const inCurrent = await q.query('SELECT 1 FROM round_entries WHERE round_id = $1 AND issue_id = $2', [
        round.id,
        issue.id,
      ]);
      if (inCurrent.rows.length > 0) throw new AppError('CONFLICT', 'Muammo allaqachon joriy davrda');
      const earlier = await q.query(
        `SELECT 1 FROM round_entries re JOIN voting_rounds vr ON vr.id = re.round_id
          WHERE re.issue_id = $1 AND vr.status = 'CLOSED'`,
        [issue.id],
      );
      if (earlier.rows.length === 0) throw new AppError('CONFLICT', "Muammo oldingi davrda qatnashmagan");

      await q.query(
        'INSERT INTO round_entries (id, round_id, issue_id, added_by_id, added_at) VALUES ($1, $2, $3, $4, $5)',
        [uuidv7(), round.id, issue.id, user.userId, now],
      );
      await recordUpdate(q, {
        issueId: issue.id,
        actorId: user.userId,
        type: 'CARRY_OVER',
        reason: "Keyingi davrga o'tkazildi",
        payload: { roundId: round.id },
        now,
      });
      await audit(q, {
        mahallaId: user.mahallaId,
        actorId: user.userId,
        action: 'issue.carry_over',
        targetType: 'ISSUE',
        targetId: issue.id,
        meta: { roundId: round.id },
        ip: req.ip,
      });
    });
    return detailFor(deps, user, params.id, now);
  },
});

// ---------------------------------------------------------------- kontentni yashirish

const contentType = z
  .string()
  .transform((s) => s.toLowerCase())
  .pipe(z.enum(['post', 'comment', 'chat_message']));

const hide = route({
  method: 'post',
  path: '/admin/content/:type/:id/hide',
  auth: 'admin',
  tag: 'Admin: moderatsiya',
  summary: "Kontentni yashirish (post | comment | chat_message; sabab majburiy)",
  params: z.object({ type: contentType, id: uuid }),
  body: z.object({ reason: text(3, 500) }),
  status: 204,
  handler: async ({ deps, user, params, body, now, req }) => {
    await deps.db.tx((q) => hideContent(deps, q, user, params.type, params.id, body.reason, now, req.ip));
  },
});

const unhide = route({
  method: 'post',
  path: '/admin/content/:type/:id/unhide',
  auth: 'admin',
  tag: 'Admin: moderatsiya',
  summary: 'Yashirilgan kontentni qaytarish',
  params: z.object({ type: contentType, id: uuid }),
  status: 204,
  handler: async ({ deps, user, params, req }) => {
    await deps.db.tx((q) => unhideContent(q, user, params.type, params.id, req.ip));
  },
});

export const adminIssueRoutes = [queue, approve, reject, merge, list, detail, transition, work, carryOver, hide, unhide];
