/** Yuklanayotgan sahifa uchun shimmer skelet (statistika kartalari + ikki blok). */
export function PageSkeleton() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Yuklanmoqda…">
      <div className="skeleton sk-title" />
      <div className="skeleton sk-sub" />
      <div className="grid-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton sk-stat" />
        ))}
      </div>
      <div className="grid-2">
        <div className="skeleton sk-block" />
        <div className="skeleton sk-block" />
      </div>
    </div>
  );
}
