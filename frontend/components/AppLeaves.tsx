// Panel ichida: ekran bo'ylab sekin tushib turuvchi mayda barglar (bosishga xalaqit bermaydi).
const LEAVES = [
  { x: 6, s: 14, d: 26, t: 0, c: 0, r: 20 },
  { x: 15, s: 11, d: 31, t: 9, c: 1, r: -30 },
  { x: 27, s: 16, d: 28, t: 4, c: 2, r: 45 },
  { x: 38, s: 12, d: 34, t: 15, c: 3, r: 10 },
  { x: 49, s: 15, d: 27, t: 7, c: 0, r: -15 },
  { x: 58, s: 11, d: 32, t: 20, c: 1, r: 60 },
  { x: 67, s: 16, d: 29, t: 2, c: 2, r: -45 },
  { x: 76, s: 12, d: 33, t: 12, c: 4, r: 25 },
  { x: 85, s: 14, d: 26, t: 18, c: 0, r: -60 },
  { x: 93, s: 12, d: 30, t: 6, c: 1, r: 35 },
];

const COLORS = ['#3aa66a', '#1f8a4c', '#7bc99a', '#e3a634', '#d9772b'];

export function AppLeaves() {
  return (
    <div className="app-leaves" aria-hidden>
      {LEAVES.map((l, i) => (
        <span
          key={i}
          className="app-leaf"
          style={
            {
              left: `${l.x}%`,
              width: l.s,
              height: l.s,
              animationDuration: `${l.d}s`,
              animationDelay: `-${l.t}s`,
              '--rot': `${l.r}deg`,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%">
            <path
              d="M12 1.5C5.5 5.5 2.8 12 5 19.5c4.6 1.2 10-1 13-6.3 2.4-4.2 2.2-8.6 2-11.7-3.3.2-6.2.2-8 0Z"
              fill={COLORS[l.c] ?? '#1f8a4c'}
            />
          </svg>
        </span>
      ))}
    </div>
  );
}
