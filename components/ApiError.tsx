export default function ApiError({ message }: { message: string }) {
  return (
    <div className="err">
      Couldn&apos;t reach the API: {message}
      <div style={{ marginTop: 6, color: "var(--muted)" }}>
        Start it with <code>backcourt serve</code> (and run <code>backcourt demo</code> once if you haven&apos;t built anything yet).
      </div>
    </div>
  );
}
