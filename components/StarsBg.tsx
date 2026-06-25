export default function StarsBg() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 opacity-70"
      style={{
        background:
          'linear-gradient(180deg, rgba(255,250,242,0.78), rgba(246,242,234,0.96)), radial-gradient(circle at 18% 12%, rgba(20,122,92,0.08), transparent 28%), radial-gradient(circle at 82% 18%, rgba(55,95,143,0.08), transparent 30%)',
      }}
    />
  );
}
