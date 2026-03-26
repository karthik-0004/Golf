const PagePlaceholder = ({ title, subtitle }) => (
  <section
    style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 24,
      boxShadow: 'var(--shadow-md)',
      margin: '0 auto',
      width: '100%',
      maxWidth: 920,
    }}
  >
    <p
      style={{
        color: 'var(--color-accent)',
        fontSize: 12,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontWeight: 700,
      }}
    >
      Digital Heroes
    </p>
    <h2 style={{ marginTop: 10, fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>{title}</h2>
    <p style={{ marginTop: 8, color: 'var(--color-text-secondary)' }}>
      {subtitle || `This is the ${title} placeholder. Full UI content will be added next.`}
    </p>
  </section>
)

export default PagePlaceholder
