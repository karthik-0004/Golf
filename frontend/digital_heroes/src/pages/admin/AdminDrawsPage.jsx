import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Edit3, Plus, Shuffle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

import {
  adminCreateDraw,
  adminGetAnalytics,
  adminGetDraws,
  adminPublishDraw,
  adminReenterDrawNumbers,
  adminRunDraw,
} from '../../api/drawApi'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency, getMonthName } from '../../utils/formatters'
import './admin-pages.css'

const pageMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' },
}

const PAGE_SIZE = 20

const statusVariant = (status) => {
  if (status === 'published') return 'success'
  if (status === 'simulated') return 'info'
  return 'warning'
}

const getDefaultDrawForm = () => ({
  title: `${getMonthName(new Date().getMonth() + 1)} ${new Date().getFullYear()} Draw`,
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  draw_type: 'random',
  drawn_numbers: [],
  typed_number: '',
})

const validateNumbers = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length !== 5) {
    return 'Please select all 5 numbers'
  }
  if (numbers.some((n) => Number(n) < 1 || Number(n) > 45)) {
    return 'All numbers must be between 1 and 45'
  }
  if (new Set(numbers).size !== 5) {
    return 'All 5 numbers must be unique'
  }
  return null
}

const getManualValidationMeta = (numbers, duplicateMessage) => {
  if (duplicateMessage) {
    return { text: duplicateMessage, color: 'var(--color-error)' }
  }

  if (numbers.length < 5) {
    const remaining = 5 - numbers.length
    return {
      text: `Select ${remaining} more number${remaining > 1 ? 's' : ''}`,
      color: 'var(--color-text-secondary)',
    }
  }

  const error = validateNumbers(numbers)
  if (error) {
    return { text: error, color: 'var(--color-error)' }
  }

  return { text: '✓ All 5 numbers selected - ready to create!', color: 'var(--color-success)' }
}

const DrawTypeCard = ({ active, icon, title, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: '100%',
      textAlign: 'left',
      background: active ? 'rgba(200,245,68,0.12)' : 'var(--color-surface-2)',
      border: `1px solid ${active ? 'rgba(200,245,68,0.35)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: 12,
      display: 'grid',
      gap: 6,
      cursor: 'pointer',
      transition: 'var(--transition)',
      boxShadow: active ? 'inset 0 0 0 1px rgba(200,245,68,0.24)' : 'none',
    }}
  >
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${active ? 'rgba(200,245,68,0.35)' : 'var(--color-border)'}`,
          background: active ? 'rgba(200,245,68,0.12)' : 'rgba(200,245,68,0.06)',
          color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition)',
        }}
      >
        {icon}
      </span>
      <span style={{ color: active ? 'var(--color-accent)' : 'var(--color-text)' }}>{title}</span>
    </div>
    <p className="admin-subtle" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{description}</p>
  </button>
)

const NumberSlot = ({ value, onRemove }) => (
  <div
    style={{
      width: 60,
      height: 60,
      borderRadius: '50%',
      border: value === null ? '2px dashed var(--color-accent)' : '2px solid var(--color-accent)',
      background: value === null ? 'transparent' : 'var(--color-accent)',
      color: value === null ? 'var(--color-text-secondary)' : '#0A0A0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20,
      fontWeight: 700,
      position: 'relative',
      userSelect: 'none',
    }}
  >
    {value === null ? '--' : value}
    {value !== null ? (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${value}`}
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '1px solid var(--color-border)',
          background: '#111827',
          color: 'white',
          lineHeight: 1,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        x
      </button>
    ) : null}
  </div>
)

const AdminDrawsPage = () => {
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [confirmRun, setConfirmRun] = useState(null)
  const [confirmPublish, setConfirmPublish] = useState(null)
  const [drawForm, setDrawForm] = useState(getDefaultDrawForm())
  const [pickerDuplicateError, setPickerDuplicateError] = useState('')
  const [pickerShake, setPickerShake] = useState(false)

  const [reenterOpen, setReenterOpen] = useState(false)
  const [reenterTargetDraw, setReenterTargetDraw] = useState(null)
  const [reenterNumbers, setReenterNumbers] = useState(['', '', '', '', ''])
  const [focusedReenterIndex, setFocusedReenterIndex] = useState(null)

  const drawsQuery = useQuery({
    queryKey: ['admin-draws'],
    queryFn: async () => (await adminGetDraws()).data,
  })

  const analyticsQuery = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => (await adminGetAnalytics()).data,
  })

  const createMutation = useMutation({
    mutationFn: (payload) => adminCreateDraw(payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-draws'] })
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['admin-winners'] })
      toast.success(response?.data?.message || 'Draw created successfully.')
      setCreateOpen(false)
      setDrawForm(getDefaultDrawForm())
      setPickerDuplicateError('')
    },
    onError: (error) => {
      const detail = error?.response?.data?.error || error?.response?.data?.detail
      toast.error(detail || 'Unable to create draw.')
    },
  })

  const runMutation = useMutation({
    mutationFn: (id) => adminRunDraw(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-draws'] })
      queryClient.invalidateQueries({ queryKey: ['admin-winners'] })
      toast.success('Draw simulation completed.')
      setConfirmRun(null)
    },
    onError: (error) => {
      const detail = error?.response?.data?.detail || error?.response?.data?.error
      toast.error(detail || 'Unable to run draw.')
    },
  })

  const reenterMutation = useMutation({
    mutationFn: ({ id, payload }) => adminReenterDrawNumbers(id, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-draws'] })
      queryClient.invalidateQueries({ queryKey: ['admin-winners'] })
      toast.success(response?.data?.message || 'Draw numbers updated. Winners recalculated.')
      setReenterOpen(false)
      setReenterTargetDraw(null)
      setReenterNumbers(['', '', '', '', ''])
    },
    onError: (error) => {
      const detail = error?.response?.data?.error || error?.response?.data?.detail
      toast.error(detail || 'Unable to update draw numbers.')
    },
  })

  const publishMutation = useMutation({
    mutationFn: (id) => adminPublishDraw(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-draws'] })
      toast.success('Draw published successfully.')
      setConfirmPublish(null)
    },
    onError: (error) => {
      const detail = error?.response?.data?.detail
      toast.error(detail || 'Unable to publish draw.')
    },
  })

  const draws = Array.isArray(drawsQuery.data) ? drawsQuery.data : []
  const analytics = analyticsQuery.data || {}

  const drawIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return Number(params.get('draw_id') || 0)
  }, [])

  const pagedDraws = draws.slice(0, PAGE_SIZE)

  const manualSlots = useMemo(() => {
    const slots = [null, null, null, null, null]
    drawForm.drawn_numbers.forEach((num, idx) => {
      if (idx < 5) slots[idx] = num
    })
    return slots
  }, [drawForm.drawn_numbers])

  const manualValidation = getManualValidationMeta(drawForm.drawn_numbers, pickerDuplicateError)

  const triggerShake = () => {
    setPickerShake(true)
    setTimeout(() => setPickerShake(false), 260)
  }

  const addManualNumber = (rawValue) => {
    const value = Number(rawValue)
    if (!Number.isInteger(value) || value < 1 || value > 45) {
      setPickerDuplicateError('All numbers must be between 1 and 45')
      toast.error('All numbers must be between 1 and 45')
      triggerShake()
      return false
    }

    if (drawForm.drawn_numbers.includes(value)) {
      setPickerDuplicateError('That number is already selected')
      toast.error('That number is already selected')
      triggerShake()
      return false
    }

    if (drawForm.drawn_numbers.length >= 5) {
      setPickerDuplicateError('All 5 numbers already selected')
      toast.error('All 5 numbers already selected')
      triggerShake()
      return false
    }

    setPickerDuplicateError('')
    setDrawForm((prev) => ({ ...prev, drawn_numbers: [...prev.drawn_numbers, value] }))
    return true
  }

  const removeManualNumber = (value) => {
    setDrawForm((prev) => ({
      ...prev,
      drawn_numbers: prev.drawn_numbers.filter((num) => num !== value),
    }))
    setPickerDuplicateError('')
  }

  const clearManualNumbers = () => {
    setDrawForm((prev) => ({ ...prev, drawn_numbers: [], typed_number: '' }))
    setPickerDuplicateError('')
  }

  const handleTypedNumberSubmit = (event) => {
    event.preventDefault()
    const raw = drawForm.typed_number.trim()
    if (!raw) return
    const ok = addManualNumber(raw)
    if (ok) {
      setDrawForm((prev) => ({ ...prev, typed_number: '' }))
    }
  }

  const handleReenterNumberChange = (index, value) => {
    const nums = [...reenterNumbers]
    nums[index] = value === '' ? '' : Number.parseInt(value, 10)
    setReenterNumbers(nums)
  }

  const getInputBorderColor = (value, isFocused) => {
    if (value === '' || value === null || Number.isNaN(Number(value))) {
      return isFocused ? 'var(--color-accent)' : 'var(--color-border)'
    }
    if (Number(value) < 1 || Number(value) > 45) {
      return 'var(--color-error)'
    }
    return 'var(--color-accent)'
  }

  const openReenterModal = (draw) => {
    const existing = Array.isArray(draw?.drawn_numbers) && draw.drawn_numbers.length === 5
      ? draw.drawn_numbers.map((n) => Number(n))
      : ['', '', '', '', '']
    setReenterTargetDraw(draw)
    setReenterNumbers(existing)
    setReenterOpen(true)
  }

  const submitCreate = () => {
    if (drawForm.draw_type === 'manual') {
      const validationError = validateNumbers(drawForm.drawn_numbers)
      if (validationError) {
        toast.error(validationError)
        return
      }

      createMutation.mutate({
        title: drawForm.title,
        month: drawForm.month,
        year: drawForm.year,
        draw_type: 'manual',
        drawn_numbers: drawForm.drawn_numbers,
      })
      return
    }

    createMutation.mutate({
      title: drawForm.title,
      month: drawForm.month,
      year: drawForm.year,
      draw_type: 'random',
    })
  }

  const submitReenter = () => {
    if (!reenterTargetDraw?.id) return

    const nums = reenterNumbers
    if (nums.some((n) => n === '' || n === null || Number.isNaN(Number(n)))) {
      toast.error('Please fill all 5 numbers')
      return
    }
    if (nums.some((n) => Number(n) < 1 || Number(n) > 45)) {
      toast.error('All numbers must be between 1 and 45')
      return
    }
    if (new Set(nums.map((n) => Number(n))).size !== 5) {
      toast.error('All 5 numbers must be unique')
      return
    }

    reenterMutation.mutate({
      id: reenterTargetDraw.id,
      payload: { drawn_numbers: nums.map((n) => Number(n)) },
    })
  }

  if (drawsQuery.isLoading || analyticsQuery.isLoading) {
    return (
      <div className="admin-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (drawsQuery.isError || analyticsQuery.isError) {
    return (
      <div className="admin-error">
        <p>Unable to load draws.</p>
        <Button
          onClick={() => {
            drawsQuery.refetch()
            analyticsQuery.refetch()
          }}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <motion.div className="admin-page" {...pageMotion}>
      <header className="admin-page-header">
        <div>
          <h1>Draw Management</h1>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          Create New Draw
        </Button>
      </header>

      {!draws.length ? (
        <Card padding={24}>
          <div className="admin-empty">
            <p>Add your first draw to get started.</p>
            <Button onClick={() => setCreateOpen(true)}>Create your first draw</Button>
          </div>
        </Card>
      ) : (
        <section style={{ display: 'grid', gap: 10 }}>
          {pagedDraws.map((draw) => {
            const winnerSummary = draw.winner_summary || { '5_match': 0, '4_match': 0, '3_match': 0 }
            const highlighted = drawIdFromQuery && drawIdFromQuery === draw.id
            const isManual = draw.draw_type === 'manual'

            return (
              <Card
                key={draw.id}
                padding={16}
                className={highlighted ? 'admin-highlighted' : ''}
              >
                <div className="admin-grid-3" style={{ alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 24 }}>
                      {getMonthName(Number(draw.month || 1))} {draw.year}
                    </h3>
                    <Badge variant="info" style={{ marginTop: 6 }}>
                      {isManual ? '✏️ Manual' : '🎲 Random'}
                    </Badge>
                  </div>

                  <div style={{ display: 'grid', gap: 6 }}>
                    <Badge variant={statusVariant(draw.status)}>{draw.status}</Badge>
                    <p className="admin-subtle">J: {formatCurrency(Number(draw.jackpot_amount || 0))}</p>
                    <p className="admin-subtle">4 Match: {formatCurrency(Number(draw.pool_4_match || 0))}</p>
                    <p className="admin-subtle">3 Match: {formatCurrency(Number(draw.pool_3_match || 0))}</p>

                    {Array.isArray(draw.drawn_numbers) && draw.drawn_numbers.length ? (
                      <div className="admin-pills">
                        {draw.drawn_numbers.map((num, index) => (
                          <span key={`${draw.id}-${index}`} className="admin-pill admin-pill-accent">{num}</span>
                        ))}
                      </div>
                    ) : null}

                    <p className="admin-subtle">
                      {winnerSummary['5_match']} jackpot winners, {winnerSummary['4_match']} 4-match, {winnerSummary['3_match']} 3-match
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {!isManual && draw.status === 'pending' ? (
                      <Button onClick={() => setConfirmRun(draw)}>Run Draw 🎲</Button>
                    ) : null}

                    {draw.status === 'simulated' ? (
                      <>
                        <Button onClick={() => setConfirmPublish(draw)}>Publish Draw</Button>
                        {isManual ? (
                          <Button variant="outline" onClick={() => openReenterModal(draw)}>Re-enter Numbers</Button>
                        ) : null}
                      </>
                    ) : null}

                    {draw.status === 'published' ? (
                      <>
                        <Link to={`/admin/winners?draw_id=${draw.id}`} style={{ color: 'var(--color-accent)' }}>
                          View Winners
                        </Link>
                        <Badge variant="success">Locked</Badge>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            )
          })}
        </section>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create New Draw" size="lg">
        <div style={{ display: 'grid', gap: 14 }}>
          <label>
            <span className="admin-subtle">Title</span>
            <input
              className="admin-input"
              value={drawForm.title}
              onChange={(event) => setDrawForm((prev) => ({ ...prev, title: event.target.value }))}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>

          <div className="admin-grid-2">
            <label>
              <span className="admin-subtle">Month</span>
              <select
                className="admin-select"
                value={drawForm.month}
                onChange={(event) => setDrawForm((prev) => ({ ...prev, month: Number(event.target.value) }))}
                style={{ width: '100%', marginTop: 4 }}
              >
                {Array.from({ length: 12 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>{idx + 1} - {getMonthName(idx + 1)}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="admin-subtle">Year</span>
              <input
                type="number"
                className="admin-input"
                value={drawForm.year}
                onChange={(event) => setDrawForm((prev) => ({ ...prev, year: Number(event.target.value) }))}
                style={{ width: '100%', marginTop: 4 }}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <DrawTypeCard
              active={drawForm.draw_type === 'random'}
              icon={<Shuffle size={16} />}
              title="Random Draw"
              description="5 numbers generated automatically by the system"
              onClick={() => {
                setPickerDuplicateError('')
                setDrawForm((prev) => ({ ...prev, draw_type: 'random' }))
              }}
            />
            <DrawTypeCard
              active={drawForm.draw_type === 'manual'}
              icon={<Edit3 size={16} />}
              title="Manual Draw"
              description="You enter the 5 drawn numbers yourself"
              onClick={() => {
                setPickerDuplicateError('')
                setDrawForm((prev) => ({ ...prev, draw_type: 'manual' }))
              }}
            />
          </div>

          {drawForm.draw_type === 'random' ? (
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-2)',
                padding: 12,
                color: 'var(--color-text-secondary)',
              }}
            >
              🎲 5 random numbers will be generated automatically when you create this draw.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <p className="admin-subtle">Draw Numbers (enter 5 numbers between 1-45)</p>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  animation: pickerShake ? 'adminPickerShake 0.25s ease-in-out' : 'none',
                }}
              >
                {manualSlots.map((value, index) => (
                  <NumberSlot
                    key={`manual-slot-${index}`}
                    value={value}
                    onRemove={() => value !== null && removeManualNumber(value)}
                  />
                ))}
              </div>

              <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(9, minmax(40px, 1fr))',
                    gap: 8,
                    minWidth: 420,
                  }}
                >
                  {Array.from({ length: 45 }, (_, idx) => idx + 1).map((num) => {
                    const selected = drawForm.drawn_numbers.includes(num)
                    return (
                      <button
                        key={`picker-${num}`}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            removeManualNumber(num)
                          } else {
                            addManualNumber(num)
                          }
                        }}
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          background: selected ? 'var(--color-accent)' : 'var(--color-surface-2)',
                          color: selected ? '#0A0A0A' : 'var(--color-text)',
                          fontWeight: 700,
                          height: 34,
                          cursor: 'pointer',
                          transition: 'var(--transition)',
                        }}
                      >
                        {num}
                      </button>
                    )
                  })}
                </div>
              </div>

              <form onSubmit={handleTypedNumberSubmit}>
                <input
                  className="admin-input"
                  value={drawForm.typed_number}
                  onChange={(event) => setDrawForm((prev) => ({ ...prev, typed_number: event.target.value }))}
                  placeholder="Or type a number (1-45) and press Enter"
                  style={{ width: '100%' }}
                />
              </form>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <p style={{ color: manualValidation.color }}>{manualValidation.text}</p>
                <Button size="sm" variant="ghost" onClick={clearManualNumbers}>Clear All</Button>
              </div>
            </div>
          )}

          <p className="admin-subtle">
            This draw will automatically enter {analytics.active_subscribers || 0} active subscribers.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={submitCreate}>Create Draw</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(confirmRun)} onClose={() => setConfirmRun(null)} title="Run draw simulation" size="sm">
        <p className="admin-subtle" style={{ marginBottom: 10 }}>
          This will generate drawn numbers and calculate all winners. Continue?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={() => setConfirmRun(null)}>Cancel</Button>
          <Button loading={runMutation.isPending} onClick={() => runMutation.mutate(confirmRun.id)}>
            Continue
          </Button>
        </div>
      </Modal>

      <Modal isOpen={reenterOpen} onClose={() => setReenterOpen(false)} title="Re-enter Draw Numbers" size="md">
        <div style={{ display: 'grid', gap: 10 }}>
          <p className="admin-subtle">
            Enter 5 new draw numbers to recalculate winners for this simulated draw.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {reenterNumbers.map((value, index) => (
              <input
                key={`reenter-draw-number-${index}`}
                type="number"
                min={1}
                max={45}
                placeholder="--"
                value={value}
                onChange={(event) => handleReenterNumberChange(index, event.target.value)}
                onFocus={() => setFocusedReenterIndex(index)}
                onBlur={() => setFocusedReenterIndex(null)}
                style={{
                  width: '56px',
                  height: '56px',
                  textAlign: 'center',
                  fontSize: '20px',
                  fontWeight: '700',
                  background: 'var(--color-surface-2)',
                  border: `2px solid ${getInputBorderColor(value, focusedReenterIndex === index)}`,
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" onClick={() => setReenterOpen(false)}>Cancel</Button>
            <Button loading={reenterMutation.isPending} onClick={submitReenter}>Recalculate Winners</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(confirmPublish)} onClose={() => setConfirmPublish(null)} title="Publish draw" size="sm">
        <p className="admin-subtle" style={{ marginBottom: 10 }}>
          Publishing will make results visible to all users. Continue?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={() => setConfirmPublish(null)}>Cancel</Button>
          <Button loading={publishMutation.isPending} onClick={() => publishMutation.mutate(confirmPublish.id)}>
            Publish
          </Button>
        </div>
      </Modal>

      <style>
        {`@keyframes adminPickerShake {0%{transform:translateX(0)}25%{transform:translateX(-6px)}50%{transform:translateX(6px)}75%{transform:translateX(-4px)}100%{transform:translateX(0)}}`}
      </style>
    </motion.div>
  )
}

export default AdminDrawsPage
