import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, CreditCard, Heart, Star, Trophy, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { adminGetAnalytics, adminGetDraws } from '../../api/drawApi'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency, getMonthName } from '../../utils/formatters'
import './admin-pages.css'

const pageMotion = {
	initial: { opacity: 0, y: 16 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.3, ease: 'easeOut' },
}

const getStatusVariant = (status) => {
	if (status === 'published') return 'success'
	if (status === 'simulated') return 'info'
	return 'warning'
}

const AdminDashboardPage = () => {
	const navigate = useNavigate()

	const analyticsQuery = useQuery({
		queryKey: ['admin-analytics'],
		queryFn: async () => (await adminGetAnalytics()).data,
	})

	const drawsQuery = useQuery({
		queryKey: ['admin-draws'],
		queryFn: async () => (await adminGetDraws()).data,
	})

	const analytics = analyticsQuery.data || {}
	const draws = Array.isArray(drawsQuery.data) ? drawsQuery.data : []

	const conversionRate = useMemo(() => {
		const totalUsers = Number(analytics.total_users || 0)
		const activeSubscribers = Number(analytics.active_subscribers || 0)
		if (!totalUsers) return 0
		return Math.round((activeSubscribers / totalUsers) * 100)
	}, [analytics.active_subscribers, analytics.total_users])

	const latestDraws = useMemo(() => draws.slice(0, 3), [draws])

	if (analyticsQuery.isLoading || drawsQuery.isLoading) {
		return (
			<div className="admin-loading">
				<Spinner size="lg" />
			</div>
		)
	}

	if (analyticsQuery.isError || drawsQuery.isError) {
		return (
			<div className="admin-error">
				<p>Unable to load admin overview.</p>
				<Button
					onClick={() => {
						analyticsQuery.refetch()
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
					<h1>Platform Overview</h1>
					<p>Live stats across all modules</p>
				</div>
			</header>

			<section className="admin-grid-6">
				<Card padding={16}>
					<div className="admin-stat-icon" style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8' }}>
						<Users size={18} />
					</div>
					<p className="admin-stat-label">Total Users</p>
					<p className="admin-stat-value">{analytics.total_users || 0}</p>
					<p className="admin-subtle">registered accounts</p>
				</Card>

				<Card padding={16}>
					<div className="admin-stat-icon" style={{ background: 'rgba(34,197,94,0.16)', color: 'var(--color-success)' }}>
						<CreditCard size={18} />
					</div>
					<p className="admin-stat-label">Active Subscribers</p>
					<p className="admin-stat-value">{analytics.active_subscribers || 0}</p>
					<p className="admin-subtle">paying members</p>
					<p className="admin-subtle">conversion rate: {conversionRate}%</p>
				</Card>

				<Card padding={16}>
					<div className="admin-stat-icon" style={{ background: 'rgba(200,245,68,0.16)', color: 'var(--color-accent)' }}>
						<Trophy size={18} />
					</div>
					<p className="admin-stat-label">Total Prize Pool</p>
					<p className="admin-stat-value">{formatCurrency(Number(analytics.total_prize_pool || 0))}</p>
					<p className="admin-subtle">across all draws</p>
				</Card>

				<Card padding={16}>
					<div className="admin-stat-icon" style={{ background: 'rgba(245,158,11,0.16)', color: 'var(--color-warning)' }}>
						<Star size={18} />
					</div>
					<p className="admin-stat-label">Total Paid Out</p>
					<p className="admin-stat-value">{formatCurrency(Number(analytics.total_paid_out || 0))}</p>
					<p className="admin-subtle">to winners</p>
				</Card>

				<Card padding={16}>
					<div className="admin-stat-icon" style={{ background: 'rgba(244,114,182,0.14)', color: '#F472B6' }}>
						<Heart size={18} />
					</div>
					<p className="admin-stat-label">Charity Contributions</p>
					<p className="admin-stat-value">{formatCurrency(Number(analytics.total_charity_contributions || 0))}</p>
					<p className="admin-subtle">donated to charities</p>
				</Card>

				<Card padding={16}>
					<div className="admin-stat-icon" style={{ background: 'rgba(139,92,246,0.14)', color: '#A78BFA' }}>
						<BarChart3 size={18} />
					</div>
					<p className="admin-stat-label">Total Draws</p>
					<p className="admin-stat-value">{analytics.total_draws || 0}</p>
					<p className="admin-subtle">{analytics.published_draws || 0} published</p>
				</Card>
			</section>

			<section className="admin-grid-2">
				<Card padding={18}>
					<h3 style={{ fontSize: 18, marginBottom: 10 }}>Quick Actions</h3>
					<div style={{ display: 'grid', gap: 8 }}>
						<Button onClick={() => navigate('/admin/draws')}>Create New Draw</Button>
						<Button variant="outline" onClick={() => navigate('/admin/winners?status=pending')}>
							View Pending Winners
						</Button>
						<Button variant="outline" onClick={() => navigate('/admin/charities')}>
							Add Charity
						</Button>
						<Button variant="ghost" onClick={() => navigate('/admin/users')}>
							View All Users
						</Button>
					</div>
				</Card>

				<Card padding={18}>
					<h3 style={{ fontSize: 18, marginBottom: 10 }}>Draw Status</h3>
					{!latestDraws.length ? (
						<p className="admin-subtle">No draws created yet.</p>
					) : (
						<div style={{ display: 'grid', gap: 10 }}>
							{latestDraws.map((draw) => (
								<div
									key={draw.id}
									style={{
										border: '1px solid var(--color-border)',
										borderRadius: 'var(--radius-md)',
										padding: 12,
										display: 'flex',
										justifyContent: 'space-between',
										gap: 10,
										alignItems: 'center',
										flexWrap: 'wrap',
									}}
								>
									<div>
										<p style={{ fontWeight: 700 }}>
											{getMonthName(Number(draw.month || 1))} {draw.year}
										</p>
										<p className="admin-subtle">{formatCurrency(Number(draw.jackpot_amount || 0))}</p>
									</div>

									<div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
										<Badge variant={getStatusVariant(draw.status)}>{draw.status}</Badge>
										<Link to={`/admin/draws?draw_id=${draw.id}`} style={{ color: 'var(--color-accent)' }}>
											View
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</Card>
			</section>
		</motion.div>
	)
}

export default AdminDashboardPage
