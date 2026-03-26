const Skeleton = ({ width = '100%', height = 16, borderRadius = 8, count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={`skeleton-${idx}`}
        style={{
          width,
          height,
          borderRadius,
          background: 'linear-gradient(90deg, var(--color-surface), var(--color-surface-2), var(--color-surface))',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.2s linear infinite',
          marginBottom: idx < count - 1 ? 8 : 0,
        }}
      />
    ))}
  </>
)

export default Skeleton