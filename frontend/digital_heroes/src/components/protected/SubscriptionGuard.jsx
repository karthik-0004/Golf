import { Link } from 'react-router-dom'

import Button from '../ui/Button'
import useAuthStore from '../../store/authStore'

const SubscriptionGuard = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  if (user?.is_staff) {
    return children
  }

  if (isAuthenticated && !user?.is_subscriber) {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div
          style={{
            border: '1px solid rgba(245,158,11,0.45)',
            background: 'rgba(245,158,11,0.12)',
            borderRadius: 'var(--radius-md)',
            padding: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <p style={{ color: '#fcd34d', fontWeight: 600 }}>
            Your subscription is inactive. Subscribe to access draws and score tracking.
          </p>
          <Link to="/subscribe">
            <Button size="sm">Subscribe Now</Button>
          </Link>
        </div>
      </div>
    )
  }

  return children
}

export default SubscriptionGuard