import { Link } from 'react-router-dom'

import Button from '../components/ui/Button'

const NotFoundPage = () => (
  <div
    style={{
      minHeight: '65vh',
      display: 'grid',
      placeItems: 'center',
      textAlign: 'center',
      padding: 24,
    }}
  >
    <div>
      <p style={{ fontSize: 'clamp(72px, 10vw, 120px)', lineHeight: 1, color: 'var(--color-accent)', fontWeight: 800 }}>
        404
      </p>
      <h1 style={{ marginTop: 8, fontSize: 34 }}>Page Not Found</h1>
      <div style={{ marginTop: 18 }}>
        <Link to="/">
          <Button>← Go Home</Button>
        </Link>
      </div>
    </div>
  </div>
)

export default NotFoundPage