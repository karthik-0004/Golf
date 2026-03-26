import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

import {
	adminCreateDraw,
	adminGetAnalytics,
	adminGetDraws,
	adminPublishDraw,
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

const statusVariant = (status) => {
	if (status === 'published') return 'success'
	if (status === 'simulated') return 'info'
	return 'warning'
}

const AdminDrawsPage = () => {
	const queryClient = useQueryClient()
	const [createOpen, setCreateOpen] = useState(false)
	const [confirmRun, setConfirmRun] = useState(null)
	const [confirmPublish, setConfirmPublish] = useState(null)
	const [createForm, setCreateForm] = useState({
		title: `${getMonthName(new Date().getMonth() + 1)} ${new Date().getFullYear()} Draw`,
		month: new Date().getMonth() + 1,
		year: new Date().getFullYear(),
		draw_type: 'random',
	})

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
			const count = response?.data?.entries_created ?? analytics.active_subscribers ?? 0
			toast.success(`Draw created! ${count} subscribers entered automatically.`)
			setCreateOpen(false)
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail
			toast.error(detail || 'Unable to create draw.')
		},
	})

	const runMutation = useMutation({
		mutationFn: (id) => adminRunDraw(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-draws'] })
			toast.success('Draw simulation completed.')
			setConfirmRun(null)
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail
			toast.error(detail || 'Unable to run draw.')
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
					{draws.map((draw) => {
						const matchSummary = draw.winner_summary
						const highlighted = drawIdFromQuery && drawIdFromQuery === draw.id

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
										<Badge variant="info" style={{ marginTop: 6 }}>{draw.draw_type}</Badge>
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

										{matchSummary ? (
											<p className="admin-subtle">
												{matchSummary['5_match']} jackpot winners, {matchSummary['4_match']} 4-match, {matchSummary['3_match']} 3-match
											</p>
										) : null}
									</div>

									<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
										{draw.status === 'pending' ? (
											<Button onClick={() => setConfirmRun(draw)}>Run Draw</Button>
										) : null}

										{draw.status === 'simulated' ? (
											<>
												<Button onClick={() => setConfirmPublish(draw)}>Publish Draw</Button>
												<Button variant="outline" onClick={() => setConfirmRun(draw)}>Re-run Simulation</Button>
											</>
										) : null}

										{draw.status === 'published' ? (
											<>
												<Link to={`/admin/winners?draw_id=${draw.id}`} style={{ color: 'var(--color-accent)' }}>
													View Winners
												</Link>
												<Badge variant="success">Published</Badge>
											</>
										) : null}
									</div>
								</div>
							</Card>
						)
					})}
				</section>
			)}

			<Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create New Draw" size="md">
				<div style={{ display: 'grid', gap: 10 }}>
					<label>
						<span className="admin-subtle">Title</span>
						<input
							className="admin-input"
							value={createForm.title}
							onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
							style={{ width: '100%', marginTop: 4 }}
						/>
					</label>

					<div className="admin-grid-2">
						<label>
							<span className="admin-subtle">Month</span>
							<select
								className="admin-select"
								value={createForm.month}
								onChange={(event) => setCreateForm((prev) => ({ ...prev, month: Number(event.target.value) }))}
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
								value={createForm.year}
								onChange={(event) => setCreateForm((prev) => ({ ...prev, year: Number(event.target.value) }))}
								style={{ width: '100%', marginTop: 4 }}
							/>
						</label>
					</div>

					<div>
						<p className="admin-subtle" style={{ marginBottom: 6 }}>Draw Type</p>
						<label style={{ display: 'inline-flex', gap: 6, marginRight: 14 }}>
							<input
								type="radio"
								name="draw_type"
								value="random"
								checked={createForm.draw_type === 'random'}
								onChange={(event) => setCreateForm((prev) => ({ ...prev, draw_type: event.target.value }))}
							/>
							<span>Random</span>
						</label>
						<label style={{ display: 'inline-flex', gap: 6 }}>
							<input
								type="radio"
								name="draw_type"
								value="algorithmic"
								checked={createForm.draw_type === 'algorithmic'}
								onChange={(event) => setCreateForm((prev) => ({ ...prev, draw_type: event.target.value }))}
							/>
							<span>Algorithmic</span>
						</label>
						{createForm.draw_type === 'algorithmic' ? (
							<p className="admin-subtle" style={{ marginTop: 4 }}>
								Weighted by most frequent user scores
							</p>
						) : null}
					</div>

					<p className="admin-subtle">
						This draw will automatically enter {analytics.active_subscribers || 0} active subscribers.
					</p>

					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
						<Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
						<Button
							loading={createMutation.isPending}
							onClick={() => createMutation.mutate(createForm)}
						>
							Create Draw
						</Button>
					</div>
				</div>
			</Modal>

			<Modal isOpen={Boolean(confirmRun)} onClose={() => setConfirmRun(null)} title="Run draw simulation" size="sm">
				<p className="admin-subtle" style={{ marginBottom: 10 }}>
					This will generate drawn numbers and calculate all winners. This cannot be undone. Continue?
				</p>
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
					<Button variant="ghost" onClick={() => setConfirmRun(null)}>Cancel</Button>
					<Button loading={runMutation.isPending} onClick={() => runMutation.mutate(confirmRun.id)}>
						Continue
					</Button>
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
		</motion.div>
	)
}

export default AdminDrawsPage
