import { useMemo } from 'react'

import Spinner from './Spinner'

const variantStyles = {
  primary: {
    background: 'var(--color-accent)',
    color: '#0A0A0A',
    border: '1px solid var(--color-accent)',
  },
  secondary: {
    background: 'var(--color-surface-2)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-surface-3)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--color-accent)',
    border: '1px solid var(--color-accent)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--color-error)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-error)',
  },
}

const hoverStyles = {
  primary: {
    background: 'var(--color-accent-hover)',
  },
  secondary: {
    background: 'var(--color-surface-3)',
  },
  outline: {
    background: 'rgba(200,245,68,0.1)',
  },
  ghost: {
    background: 'var(--color-surface-2)',
  },
  danger: {
    background: '#DC2626',
  },
}

const sizeStyles = {
  sm: {
    padding: '8px 12px',
    fontSize: 13,
  },
  md: {
    padding: '10px 16px',
    fontSize: 14,
  },
  lg: {
    padding: '12px 20px',
    fontSize: 16,
  },
}

const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  children,
  icon,
}) => {
  const isDisabled = disabled || loading

  const baseStyle = useMemo(
    () => ({
      ...variantStyles[variant],
      ...sizeStyles[size],
      width: fullWidth ? '100%' : 'auto',
      borderRadius: 'var(--radius-md)',
      fontWeight: 600,
      transition: 'var(--transition)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      outline: 'none',
      opacity: loading ? 0.7 : isDisabled ? 0.6 : 1,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      boxShadow: variant === 'primary' ? 'var(--shadow-accent)' : 'none',
    }),
    [fullWidth, isDisabled, loading, size, variant],
  )

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={baseStyle}
      onMouseEnter={(event) => {
        if (isDisabled) return
        Object.assign(event.currentTarget.style, hoverStyles[variant])
      }}
      onMouseLeave={(event) => {
        if (isDisabled) return
        Object.assign(event.currentTarget.style, variantStyles[variant])
      }}
    >
      {loading ? <Spinner size="sm" /> : icon}
      <span>{loading ? 'Loading...' : children}</span>
    </button>
  )
}

export default Button
