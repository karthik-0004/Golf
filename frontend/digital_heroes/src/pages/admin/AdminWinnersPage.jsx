import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

import {
	adminGetDraws,
	adminGetWinners,
	adminMarkPaid,
	adminVerifyWinner,
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

const matchBadge = {
	'5_match': { text: '🏆 5 Match', variant: 'success' },
	'4_match': { text: '🥈 4 Match', variant: 'info' },
	'3_match': { text: '🥉 3 Match', variant: 'warning' },
}

const AdminWinnersPage = () => {
	const queryClient = useQueryClient()

	const searchParams = new URLSearchParams(window.location.search)
	const initialStatus = searchParams.get('status') || ''
	const initialDrawId = searchParams.get('draw_id') || ''

	const [verificationFilter, setVerificationFilter] = useState(
		initialStatus === 'pending' ? 'pending' : '',
	)
	const [paymentFilter, setPaymentFilter] = useState('')
	const [drawFilter, setDrawFilter] = useState(initialDrawId)
	const [page, setPage] = useState(1)

	const [reviewWinner, setReviewWinner] = useState(null)
	const [reviewNotes, setReviewNotes] = useState('')
	const [confirmPaid, setConfirmPaid] = useState(null)

	const filterParams = useMemo(() => {
		const params = {}
		if (verificationFilter) params.verification_status = verificationFilter
		if (paymentFilter) params.payment_status = paymentFilter
		if (drawFilter) params.draw_id = drawFilter
		return params
	}, [verificationFilter, paymentFilter, drawFilter])

	const winnersQuery = useQuery({
		queryKey: ['admin-winners', filterParams],
		queryFn: async () => (await adminGetWinners(filterParams)).data,
	})

	const drawsQuery = useQuery({
		queryKey: ['admin-draws'],
		queryFn: async () => (await adminGetDraws()).data,
	})

	const verifyMutation = useMutation({
		mutationFn: ({ id, payload }) => adminVerifyWinner(id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-winners'] })
			toast.success('Winner review updated.')
			setReviewWinner(null)
			setReviewNotes('')
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail || 'Unable to review winner.'
			toast.error(detail)
		},
	})

	const paidMutation = useMutation({
		mutationFn: (id) => adminMarkPaid(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-winners'] })
			toast.success('Winner marked as paid.')
			setConfirmPaid(null)
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail || 'Unable to mark as paid.'
			toast.error(detail)
		},
	})

	const winners = Array.isArray(winnersQuery.data) ? winnersQuery.data : []
	const draws = Array.isArray(drawsQuery.data) ? drawsQuery.data : []

	const stats = useMemo(() => {
		const pendingVerification = winners.filter((item) => item.verification_status === 'pending').length
		const approvedUnpaid = winners.filter(
			(item) => item.verification_status === 'approved' && item.payment_status === 'pending',
		).length
		const totalPaidOut = winners
			.filter((item) => item.payment_status === 'paid')
			.reduce((sum, item) => sum + Number(item.prize_amount || 0), 0)
		return { pendingVerification, approvedUnpaid, totalPaidOut }
	}, [winners])

	const totalPages = Math.max(1, Math.ceil(winners.length / PAGE_SIZE))
	const paged = winners.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

	const openReview = (winner) => {
		setReviewNotes(winner.admin_notes || '')
		setReviewWinner(winner)
	}

	const submitReview = (action) => {
		verifyMutation.mutate({
			id: reviewWinner.id,
			payload: {
				action,
				admin_notes: reviewNotes,
			},
		})
	}

	if (winnersQuery.isLoading || drawsQuery.isLoading) {
		return (
			<div className="admin-loading">
				<Spinner size="lg" />
			</div>
		)
	}

	if (winnersQuery.isError || drawsQuery.isError) {
		return (
			<div className="admin-error">
				<p>Unable to load winners.</p>
				<Button
					onClick={() => {
						winnersQuery.refetch()
						drawsQuery.refetch()
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
					<h1>Winners Management</h1>
					<p>Verify submissions and track payouts</p>
				</div>
			</header>

			<section className="admin-filters">
				<select
					className="admin-select"
					value={verificationFilter}
					onChange={(event) => {
						setVerificationFilter(event.target.value)
						setPage(1)
					}}
				>
					<option value="">All verification</option>
					<option value="pending">Pending</option>
					<option value="approved">Approved</option>
					<option value="rejected">Rejected</option>
				</select>

				<select
					className="admin-select"
					value={paymentFilter}
					onChange={(event) => {
						setPaymentFilter(event.target.value)
						setPage(1)
					}}
				>
					<option value="">All payment</option>
					<option value="pending">Pending</option>
					<option value="paid">Paid</option>
				</select>

				<select
					className="admin-select"
					value={drawFilter}
					onChange={(event) => {
						setDrawFilter(event.target.value)
						setPage(1)
					}}
				>
					<option value="">All draws</option>
					{draws.map((draw) => (
						<option key={draw.id} value={draw.id}>
							{getMonthName(Number(draw.month || 1))} {draw.year}
						</option>
					))}
				</select>

				<p className="admin-subtle" style={{ marginLeft: 'auto' }}>{winners.length} winners</p>
			</section>

			<section className="admin-grid-3">
				<Card padding={14}>
					<p className="admin-stat-label">Pending Verification</p>
					<p className="admin-stat-value">{stats.pendingVerification}</p>
				</Card>
				<Card padding={14}>
					<p className="admin-stat-label">Approved (unpaid)</p>
					<p className="admin-stat-value">{stats.approvedUnpaid}</p>
				</Card>
				<Card padding={14}>
					<p className="admin-stat-label">Total Paid Out</p>
					<p className="admin-stat-value">{formatCurrency(stats.totalPaidOut)}</p>
				</Card>
			</section>

			<section>
				{!winners.length ? (
					<Card padding={20}>
						<div className="admin-empty">
							<p>No winners yet.</p>
						</div>
					</Card>
				) : (
					<div className="admin-table-wrap">
						<table className="admin-table">
							<thead>
								<tr>
									<th>Winner</th>
									<th>Draw</th>
									<th>Match Type</th>
									<th>Prize Amount</th>
									<th>Verification</th>
									<th>Payment</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{paged.map((winner) => {
									const matchMeta = matchBadge[winner.match_type] || { text: winner.match_type, variant: 'default' }
									const drawLabel = `${getMonthName(Number(winner.draw?.month || 1))} ${winner.draw?.year || ''}`

									return (
										<tr key={winner.id}>
											<td>
												<p style={{ fontWeight: 700 }}>{`${winner.user?.first_name || ''} ${winner.user?.last_name || ''}`.trim() || winner.user?.email}</p>
												<small className="admin-subtle">{winner.user?.email}</small>
											</td>
											<td>{drawLabel}</td>
											<td><Badge variant={matchMeta.variant}>{matchMeta.text}</Badge></td>
											<td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
												{formatCurrency(Number(winner.prize_amount || 0))}
											</td>
											<td>
												<Badge
													variant={
														winner.verification_status === 'approved'
															? 'success'
															: winner.verification_status === 'rejected'
																? 'error'
																: 'warning'
													}
												>
													{winner.verification_status}
												</Badge>
											</td>
											<td>
												<Badge variant={winner.payment_status === 'paid' ? 'success' : 'warning'}>
													{winner.payment_status}
												</Badge>
											</td>
											<td>
												{winner.verification_status === 'pending' ? (
													<Button size="sm" variant="outline" onClick={() => openReview(winner)}>
														Review
													</Button>
												) : null}

												{winner.verification_status === 'approved' && winner.payment_status === 'pending' ? (
													<Button size="sm" onClick={() => setConfirmPaid(winner)}>
														Mark as Paid
													</Button>
												) : null}

												{winner.verification_status === 'rejected' ? (
													<Button size="sm" variant="ghost" onClick={() => openReview(winner)}>
														View Details
													</Button>
												) : null}

												{winner.payment_status === 'paid' ? (
													<Badge variant="success">Paid ✓</Badge>
												) : null}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<section className="admin-pagination">
				<Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
					Prev
				</Button>
				<span className="admin-subtle">Page {page} / {totalPages}</span>
				<Button
					size="sm"
					variant="ghost"
					disabled={page >= totalPages}
					onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
				>
					Next
				</Button>
			</section>

			<Modal
				isOpen={Boolean(reviewWinner)}
				onClose={() => setReviewWinner(null)}
				title="Winner Review"
				size="lg"
			>
				{reviewWinner ? (
					<div style={{ display: 'grid', gap: 12 }}>
						<div>
							<p><strong>Winner:</strong> {`${reviewWinner.user?.first_name || ''} ${reviewWinner.user?.last_name || ''}`.trim()}</p>
							<p><strong>Email:</strong> {reviewWinner.user?.email}</p>
							<p><strong>Match Type:</strong> {matchBadge[reviewWinner.match_type]?.text || reviewWinner.match_type}</p>
							<p><strong>Prize:</strong> {formatCurrency(Number(reviewWinner.prize_amount || 0))}</p>
						</div>

						<div>
							<p style={{ marginBottom: 6, fontWeight: 700 }}>Draw details</p>
							<p className="admin-subtle" style={{ marginBottom: 6 }}>
								{getMonthName(Number(reviewWinner.draw?.month || 1))} {reviewWinner.draw?.year}
							</p>
							<div className="admin-pills">
								{(reviewWinner.draw?.drawn_numbers || []).map((num, idx) => (
									<span key={`${idx}-${num}`} className="admin-pill admin-pill-accent">{num}</span>
								))}
							</div>
						</div>

						<div>
							<p style={{ marginBottom: 6, fontWeight: 700 }}>Winner score snapshot</p>
							<div className="admin-pills">
								{(reviewWinner.draw?.drawn_numbers || []).length && reviewWinner.user_scores_snapshot
									? reviewWinner.user_scores_snapshot.map((score, idx) => {
											const scoreValue = Number(score?.score ?? score)
											const isMatch = (reviewWinner.draw?.drawn_numbers || []).includes(scoreValue)
											return (
												<span key={`${idx}-${scoreValue}`} className={`admin-pill ${isMatch ? 'admin-pill-accent' : ''}`}>
													{scoreValue}
												</span>
											)
										})
									: <p className="admin-subtle">Snapshot unavailable from API response.</p>}
							</div>
						</div>

						<div>
							<p style={{ marginBottom: 6, fontWeight: 700 }}>Proof screenshot</p>
							{reviewWinner.proof_screenshot ? (
								<div style={{ display: 'grid', gap: 8 }}>
									<img
										src={reviewWinner.proof_screenshot}
										alt="Proof screenshot"
										style={{ maxHeight: 260, objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
									/>
									<a href={reviewWinner.proof_screenshot} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>
										View Full Size
									</a>
								</div>
							) : (
								<p className="admin-subtle">No proof uploaded yet</p>
							)}
						</div>

						<div>
							<p className="admin-subtle" style={{ marginBottom: 4 }}>Admin notes</p>
							<textarea
								className="admin-textarea"
								value={reviewNotes}
								onChange={(event) => setReviewNotes(event.target.value)}
							/>
						</div>

						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
							<Button
								variant="danger"
								loading={verifyMutation.isPending}
								onClick={() => submitReview('reject')}
							>
								Reject ✗
							</Button>
							<Button
								loading={verifyMutation.isPending}
								onClick={() => submitReview('approve')}
							>
								Approve ✓
							</Button>
						</div>
					</div>
				) : null}
			</Modal>

			<Modal
				isOpen={Boolean(confirmPaid)}
				onClose={() => setConfirmPaid(null)}
				title="Confirm payout"
				size="sm"
			>
				{confirmPaid ? (
					<>
						<p className="admin-subtle" style={{ marginBottom: 10 }}>
							Confirm payment of {formatCurrency(Number(confirmPaid.prize_amount || 0))} to{' '}
							{`${confirmPaid.user?.first_name || ''} ${confirmPaid.user?.last_name || ''}`.trim() || confirmPaid.user?.email}?
						</p>
						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
							<Button variant="ghost" onClick={() => setConfirmPaid(null)}>Cancel</Button>
							<Button loading={paidMutation.isPending} onClick={() => paidMutation.mutate(confirmPaid.id)}>
								Confirm Paid
							</Button>
						</div>
					</>
				) : null}
			</Modal>
		</motion.div>
	)
}

export default AdminWinnersPage
