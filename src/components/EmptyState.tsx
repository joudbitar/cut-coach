// Tiny shared empty-state for sparse/no-data messaging inside a card.
// Matches the app's existing muted empty copy tone (cf. WeightChart).
export default function EmptyState({ message }: { message: string }) {
  return (
    <p
      className="muted"
      style={{
        fontSize: 13,
        textAlign: "center",
        margin: 0,
        padding: "12px 8px",
      }}
    >
      {message}
    </p>
  );
}
