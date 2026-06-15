import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <img src="/icons/icon-192.png" alt="" width={72} height={72} style={{ borderRadius: 18 }} />
        <h1 style={{ fontSize: 26, fontWeight: 700, marginTop: 14 }}>Cut Coach</h1>
        <p className="muted" style={{ marginTop: 4 }}>Enter your PIN to unlock</p>
      </div>
      <LoginForm next={next ?? "/today"} />
    </main>
  );
}
