import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CreditCard, Heart, Star, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getCurrentDraw, getMyEntries, getMyWinnings } from '../../api/drawApi'
import { getApiError } from '../../api/axiosClient'
import { getScores } from '../../api/scoresApi'
import { getSubscriptionStatus } from '../../api/subscriptionApi'
import { getProfile } from '../../api/userApi'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency, formatDate, getMonthName, getSubscriptionStatusColor } from '../../utils/formatters'
import './dashboard-pages.css'

const pageMotion = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.35, ease: 'easeOut' },
}

const getStatusBadgeVariant = (status) => {
	const color = getSubscriptionStatusColor(status)
	if (color === 'green') return 'success'
	if (color === 'orange') return 'warning'
	if (color === 'red') return 'error'
	return 'default'
}

const DashboardPage = () => {
	const profileQuery = useQuery({
		queryKey: ['profile'],
		queryFn: async () => (await getProfile()).data,
	})

	const subscriptionQuery = useQuery({
		queryKey: ['subscription-status'],
		queryFn: async () => (await getSubscriptionStatus()).data,
	})

	const scoresQuery = useQuery({
		queryKey: ['my-scores'],
		queryFn: async () => (await getScores()).data,
	})

	const drawQuery = useQuery({
		queryKey: ['current-draw'],
		queryFn: async () => {
			try {
				return (await getCurrentDraw()).data
			} catch (error) {
				if (error?.response?.status === 404) {
					return null
				}
				throw new Error(getApiError(error))
			}
		},
		retry: 1,
	})

	const winningsQuery = useQuery({
		queryKey: ['my-winnings'],
		queryFn: async () => (await getMyWinnings()).data,
	})

	const entriesQuery = useQuery({
		queryKey: ['my-entries'],
		queryFn: async () => (await getMyEntries()).data,
	})

	const isLoading =
		profileQuery.isLoading ||
		subscriptionQuery.isLoading ||
		scoresQuery.isLoading ||
		drawQuery.isLoading ||
		winningsQuery.isLoading ||
		entriesQuery.isLoading

	const hasError =
		profileQuery.isError ||
		subscriptionQuery.isError ||
		scoresQuery.isError ||
		winningsQuery.isError ||
		entriesQuery.isError

	const refetchAll = () => {
		profileQuery.refetch()
		subscriptionQuery.refetch()
		scoresQuery.refetch()
		drawQuery.refetch()
		winningsQuery.refetch()
		entriesQuery.refetch()
	}

	const profile = profileQuery.data || {}
	const subscription = subscriptionQuery.data || {}
	const scores = Array.isArray(scoresQuery.data) ? scoresQuery.data : []
	const draw = drawQuery.data
	const winnings = Array.isArray(winningsQuery.data?.winnings) ? winningsQuery.data.winnings : []
	const entries = Array.isArray(entriesQuery.data) ? entriesQuery.data : []

	const totalPaid = useMemo(
		() => winnings
			.filter((winner) => winner.payment_status === 'paid')
			.reduce((sum, winner) => sum + Number(winner.prize_amount || 0), 0),
		[winnings],
	)

	const monthlySubscriptionAmount = subscription.subscription_plan === 'yearly' ? 99 / 12 : 9.99
	const contributionAmount =
		(monthlySubscriptionAmount * Number(profile.charity_contribution_percentage || 10)) / 100

	const now = new Date()
	const prettyDate = now.toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	})

	const firstName = profile.first_name || profile.username || 'Golfer'

	const drawNumbers = Array.isArray(draw?.drawn_numbers) ? draw.drawn_numbers : []
	const userScoreNumbers = scores.slice(0, 5).map((item) => Number(item.score))
	const matchedNumbers = userScoreNumbers.filter((score) => drawNumbers.includes(score))
	const currentDrawWin = winnings.find((item) => item?.draw?.id === draw?.id)

	if (isLoading) {
		return (
			<div className="dashboard-loading">
				<Spinner size="lg" />
			</div>
		)
	}

	if (hasError) {
		return (
			<div className="dashboard-error">
				<p>Unable to load your dashboard right now.</p>
				<Button onClick={refetchAll}>Retry</Button>
			</div>
		)
	}

	return (
		<motion.div className="dashboard-page" {...pageMotion}>
			<header className="dashboard-header">
				<h1>Welcome back, {firstName} 👋</h1>
				<p>{prettyDate}</p>
			</header>

			<section className="dashboard-grid-4">
				<Card padding={18}>
					<p className="dashboard-card-title">
						<CreditCard size={16} />
						<span>Subscription</span>
					</p>
					<Badge variant={getStatusBadgeVariant(subscription.subscription_status)}>
						{subscription.subscription_status || 'inactive'}
					</Badge>
					<p className="dashboard-subtle" style={{ marginTop: 10 }}>
						{(subscription.subscription_plan || 'No plan').toString().replace(/^./, (s) => s.toUpperCase())}
						{subscription.subscription_end_date ? ` · Renews ${formatDate(subscription.subscription_end_date)}` : ''}
					</p>
					{!subscription.is_subscriber ? (
						<Link className="dashboard-link-inline" to="/subscribe">
							Subscribe Now
						</Link>
					) : null}
				</Card>

				<Card padding={18}>
					<p className="dashboard-card-title">
						<Trophy size={16} />
						<span>Draw Entries</span>
					</p>
					<p className="dashboard-big-value">{entries.length}</p>
					<p className="dashboard-subtle">
						Next draw: {new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
					</p>
				</Card>

				<Card padding={18}>
					<p className="dashboard-card-title">
						<Star size={16} />
						<span>Total Won</span>
					</p>
					<p className="dashboard-big-value">{formatCurrency(totalPaid)}</p>
					<p className="dashboard-subtle">across {winnings.length} draws</p>
				</Card>

				<Card padding={18}>
					<p className="dashboard-card-title">
						<Heart size={16} />
						<span>Charity Impact</span>
					</p>
					<p className="dashboard-big-value">{formatCurrency(contributionAmount)}</p>
					<p className="dashboard-subtle">{profile?.selected_charity?.name || 'No charity selected'}</p>
				</Card>
			</section>

			<section>
				<div className="dashboard-section-head" style={{ marginBottom: 10 }}>
					<h2>My Latest Scores</h2>
					<Link to="/dashboard/scores" className="dashboard-link-inline">
						Manage Scores →
					</Link>
				</div>

				{scores.length ? (
					<div className="dashboard-pill-row">
						{scores.slice(0, 5).map((item) => (
							<div key={item.id} className="dashboard-score-pill">
								<strong>{item.score}</strong>
								<small>{formatDate(item.date_played)}</small>
							</div>
						))}
					</div>
				) : (
					<Card padding={18}>
						<p style={{ color: 'var(--color-text-secondary)' }}>
							No scores yet. Add your first Stableford score to enter draws.
						</p>
						<div style={{ marginTop: 12 }}>
							<Link to="/dashboard/scores">
								<Button>Add Score</Button>
							</Link>
						</div>
					</Card>
				)}
			</section>

			<section>
				<h2 style={{ marginBottom: 10 }}>This Month&apos;s Draw</h2>
				{draw ? (
					<Card padding={20}>
						<div className="dashboard-section-head" style={{ marginBottom: 8 }}>
							<h3 style={{ fontSize: 22 }}>
								{draw.title || `${getMonthName(draw.month)} ${draw.year}`}
							</h3>
							<Badge variant={draw.status === 'published' ? 'success' : 'warning'}>{draw.status}</Badge>
						</div>

						<p className="dashboard-subtle" style={{ marginBottom: 12 }}>
							{getMonthName(draw.month)} {draw.year}
						</p>

						<div className="dashboard-grid-3" style={{ marginBottom: 14 }}>
							<Card padding={14}>
								<p className="dashboard-card-title">5 Match Pool</p>
								<p className="dashboard-big-value">{formatCurrency(draw.jackpot_amount || 0)}</p>
							</Card>
							<Card padding={14}>
								<p className="dashboard-card-title">4 Match Pool</p>
								<p className="dashboard-big-value">{formatCurrency(draw.pool_4_match || 0)}</p>
							</Card>
							<Card padding={14}>
								<p className="dashboard-card-title">3 Match Pool</p>
								<p className="dashboard-big-value">{formatCurrency(draw.pool_3_match || 0)}</p>
							</Card>
						</div>

						{draw.status === 'published' && drawNumbers.length ? (
							<>
								<p className="dashboard-card-title" style={{ marginBottom: 8 }}>
									Drawn Numbers
								</p>
								<div className="dashboard-pill-row" style={{ marginBottom: 14 }}>
									{drawNumbers.map((num) => (
										<span key={num} className="dashboard-number-chip dashboard-number-chip--accent">
											{num}
										</span>
									))}
								</div>
							</>
						) : null}

						<p className="dashboard-card-title" style={{ marginBottom: 6 }}>
							Your Scores vs Draw
						</p>
						<div className="dashboard-pill-row" style={{ marginBottom: 10 }}>
							{userScoreNumbers.length ? userScoreNumbers.map((num, idx) => (
								<span
									key={`${num}-${idx}`}
									className={`dashboard-number-chip ${drawNumbers.includes(num) ? 'dashboard-number-chip--accent' : ''}`}
								>
									{num}
								</span>
							)) : <span className="dashboard-subtle">No scores recorded yet</span>}
						</div>

						{draw.status === 'published' ? (
							<p className="dashboard-subtle" style={{ marginBottom: 8 }}>
								You matched {matchedNumbers.length} numbers!
							</p>
						) : null}

						{currentDrawWin?.is_winner || currentDrawWin?.match_type ? (
							<div
								style={{
									border: '1px solid rgba(34,197,94,0.45)',
									background: 'rgba(34,197,94,0.12)',
									color: '#86efac',
									borderRadius: 'var(--radius-md)',
									padding: 12,
									fontWeight: 600,
								}}
							>
								Winner! Prize amount: {formatCurrency(currentDrawWin.prize_amount || 0)}
							</div>
						) : null}
					</Card>
				) : (
					<Card padding={18}>
						<p className="dashboard-subtle">No active draw this month. Check back soon!</p>
					</Card>
				)}
			</section>

			<section>
				<h2 style={{ marginBottom: 10 }}>Your Charity</h2>
				{profile?.selected_charity ? (
					<Card padding={18}>
						<h3 style={{ fontSize: 20 }}>{profile.selected_charity.name}</h3>
						<p className="dashboard-subtle">
							Contribution: {Number(profile.charity_contribution_percentage || 10)}%
						</p>
						<Link className="dashboard-link-inline" to="/dashboard/settings">
							Change Charity
						</Link>
					</Card>
				) : (
					<Card padding={18}>
						<p className="dashboard-subtle">You haven&apos;t selected a charity yet.</p>
						<div style={{ marginTop: 12 }}>
							<Link to="/charities">
								<Button>Choose a Charity</Button>
							</Link>
						</div>
					</Card>
				)}
			</section>
		</motion.div>
	)
}

export default DashboardPage
