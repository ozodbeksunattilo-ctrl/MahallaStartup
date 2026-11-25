import { redirect } from 'next/navigation';

// Landing alohida loyihada (Mahalla-landing); bu yerda uslubsiz qolgan edi, shuning uchun ildiz admin panelga olib boradi
export default function RootPage() {
  redirect('/dashboard');
}
