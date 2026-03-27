import { useEffect, useRef } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

const sizeMap = {
  sm: 420,
  md: 620,
  lg: 820,
}

const getFocusableElements = (root) =>
  root?.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  ) || []

const getInitialFocusElement = (root) => {
  if (!root) return null

  const preferred = root.querySelector(
    '[data-autofocus="true"], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
  )
  if (preferred) return preferred

  const focusable = Array.from(getFocusableElements(root))
  return focusable.find((node) => !node.hasAttribute('data-modal-close')) || focusable[0] || null
}

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const previousActiveElement = document.activeElement
    const initialFocus = getInitialFocusElement(dialogRef.current)
    if (initialFocus?.focus) {
      initialFocus.focus()
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }

      if (event.key === 'Tab') {
        const nodes = getFocusableElements(dialogRef.current)
        if (!nodes.length) return

        const first = nodes[0]
        const last = nodes[nodes.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      if (previousActiveElement?.focus) {
        previousActiveElement.focus()
      }
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              onClose?.()
            }
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Modal'}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              width: '100%',
              maxWidth: sizeMap[size] || sizeMap.md,
              maxHeight: 'calc(100vh - 32px)',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            <header
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>{title}</h3>
              <button
                type="button"
                onClick={() => onClose?.()}
                data-modal-close="true"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition)',
                }}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </header>
            <div
              style={{
                padding: 20,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
              }}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default Modal
