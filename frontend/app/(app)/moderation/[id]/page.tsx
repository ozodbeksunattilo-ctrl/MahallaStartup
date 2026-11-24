import { redirect } from 'next/navigation';

// Moderatsiya batafsil sahifasi muammo sahifasi bilan birlashtirilgan (tasdiqlash/rad etish/birlashtirish shu yerda)
export default async function ModerationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/issues/${id}`);
}
