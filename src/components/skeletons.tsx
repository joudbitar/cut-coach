// CSS-only shimmer skeletons used as Suspense fallbacks. They render the STATIC
// scaffolding (real headings, real frame) immediately in the first HTML flush so
// the card looks "already there, just sharpening" — and reserve height to keep
// CLS near zero. Capped to the hero + glance surfaces, not every card.

function Block({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  return (
    <div
      className="shimmer"
      style={{ width: w, height: h, borderRadius: r }}
    />
  );
}

export function HeroSkeleton() {
  return (
    <section className="hero">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Block w={150} h={34} />
          <div className="cap">kcal left today</div>
        </div>
        <Block w={84} h={84} r={42} />
      </div>
      <div style={{ marginTop: 14 }}>
        <Block w="100%" h={6} r={10} />
      </div>
    </section>
  );
}

export function GlanceSkeleton() {
  return (
    <section className="card">
      <h2 className="card-title" style={{ marginBottom: 12 }}>This week</h2>
      <div className="glance-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 88, justifyContent: "center" }}>
            <Block w={70} h={10} />
            <Block w={96} h={20} />
            <Block w="100%" h={24} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="stack-12">
      {[0, 1].map((i) => (
        <section key={i} className="card">
          <Block w={120} h={15} />
          <div style={{ marginTop: 14 }}>
            <Block w="100%" h={140} r={12} />
          </div>
        </section>
      ))}
    </div>
  );
}
