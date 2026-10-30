export default function Hero({ kicker, title, subtitle, right }: { kicker: string; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <>
      <div className="hero">
        <div>
          <div className="kicker">{kicker}</div>
          <h1 className="title">{title}</h1>
          {subtitle && <div className="subtitle">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="rule" />
    </>
  );
}
