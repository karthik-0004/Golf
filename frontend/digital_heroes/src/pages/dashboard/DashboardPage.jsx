import { useEffect, useMemo, useRef } from 'react'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CreditCard, Heart, Star, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useSearchParams } from 'react-router-dom'

import { getCurrentDraw, getMyEntries, getMyWinnings } from '../../api/drawApi'
import { getApiError } from '../../api/axiosClient'
import { getScores } from '../../api/scoresApi'
import { confirmCheckoutSession, getSubscriptionStatus } from '../../api/subscriptionApi'
import { getProfile } from '../../api/userApi'
import useAuthStore from '../../store/authStore'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { getCharityImage } from '../../utils/charityImages'
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

/* ─── Skeleton placeholders for progressive rendering ─── */
const CardSkeleton = () => (
	<Card padding={18}>
		<Skeleton width={100} height={14} />
		<div style={{ marginTop: 10 }}><Skeleton width={70} height={28} /></div>
		<div style={{ marginTop: 10 }}><Skeleton width={140} height={12} /></div>
	</Card>
)

const ScoresSkeleton = () => (
	<div className="dashboard-pill-row">
		{[1, 2, 3, 4, 5].map((i) => (
			<div key={i} className="dashboard-score-pill">
				<Skeleton width={40} height={28} borderRadius={6} />
				<div style={{ marginTop: 6 }}><Skeleton width={60} height={10} /></div>
			</div>
		))}
	</div>
)

const DrawSkeleton = () => (
	<Card padding={20}>
		<Skeleton width={180} height={22} />
		<div style={{ marginTop: 12 }}><Skeleton width="100%" height={14} count={3} /></div>
	</Card>
)

const CharitySkeleton = () => (
	<Card padding={18}>
		<Skeleton width="100%" height={160} borderRadius={12} />
		<div style={{ marginTop: 12 }}><Skeleton width={140} height={18} /></div>
		<div style={{ marginTop: 8 }}><Skeleton width={100} height={12} /></div>
	</Card>
)

const DashboardPage = () => {
	const [searchParams, setSearchParams] = useSearchParams()
	const paymentConfirmedRef = useRef(false)
	const setUser = useAuthStore((state) => state.setUser)

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

	useEffect(() => {
		const payment = searchParams.get('payment')
		const sessionId = searchParams.get('session_id')

		if (payment !== 'success' || paymentConfirmedRef.current) {
			return
		}

		paymentConfirmedRef.current = true

		const confirmPayment = async () => {
			try {
				if (sessionId) {
					await confirmCheckoutSession(sessionId)
				}

				const [_, profileRes] = await Promise.all([
					subscriptionQuery.refetch(),
					profileQuery.refetch(),
				])

				if (profileRes.data) {
					setUser(profileRes.data)
				}

				toast.success('Payment successful. Subscription is now active.')
			} catch (error) {
				toast.error(getApiError(error))
			} finally {
				setSearchParams({}, { replace: true })
			}
		}

		confirmPayment()
	}, [
		searchParams,
		setSearchParams,
		subscriptionQuery,
		profileQuery,
		setUser,
	])

	// NO longer blocking on ALL queries — we render progressively
	const hasAllErrors =
		profileQuery.isError &&
		subscriptionQuery.isError &&
		scoresQuery.isError &&
		winningsQuery.isError &&
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
	const selectedCharityImage = getCharityImage(profile?.selected_charity)

	if (hasAllErrors) {
		return (
			<div className="dashboard-error">
				<p>Unable to load your dashboard right now.</p>
				<Button onClick={refetchAll}>Retry</Button>
			</div>
		)
	}

	return (
		<motion.div className="dashboard-page" {...pageMotion}>
			{/* ─── Header: always show instantly ─── */}
			<header className="dashboard-header">
				<h1>
					{profileQuery.isLoading
						? <Skeleton width={260} height={34} />
						: <>Welcome back, {firstName} 👋</>
					}
				</h1>
				<p>{prettyDate}</p>
			</header>

			{/* ─── Stats cards: show skeletons per-card ─── */}
			<section className="dashboard-grid-4">
				{subscriptionQuery.isLoading ? <CardSkeleton /> : (
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
						{!subscription.is_subscriber && !profile.is_staff ? (
							<Link className="dashboard-link-inline" to="/subscribe">
								Subscribe Now
							</Link>
						) : null}
					</Card>
				)}

				{entriesQuery.isLoading ? <CardSkeleton /> : (
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
				)}

				{winningsQuery.isLoading ? <CardSkeleton /> : (
					<Card padding={18}>
						<p className="dashboard-card-title">
							<Star size={16} />
							<span>Total Won</span>
						</p>
						<p className="dashboard-big-value">{formatCurrency(totalPaid)}</p>
						<p className="dashboard-subtle">across {winnings.length} draws</p>
					</Card>
				)}

				{(profileQuery.isLoading || subscriptionQuery.isLoading) ? <CardSkeleton /> : (
					<Card padding={18}>
						<p className="dashboard-card-title">
							<Heart size={16} />
							<span>Charity Impact</span>
						</p>
						<p className="dashboard-big-value">{formatCurrency(contributionAmount)}</p>
						<p className="dashboard-subtle">{profile?.selected_charity?.name || 'No charity selected'}</p>
					</Card>
				)}
			</section>

			{/* ─── Scores section ─── */}
			<section>
				<div className="dashboard-section-head" style={{ marginBottom: 10 }}>
					<h2>My Latest Scores</h2>
					<Link to="/dashboard/scores" className="dashboard-link-inline">
						Manage Scores →
					</Link>
				</div>

				{scoresQuery.isLoading ? <ScoresSkeleton /> : scores.length ? (
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

			{/* ─── Draw section ─── */}
			<section>
				<h2 style={{ marginBottom: 10 }}>This Month&apos;s Draw</h2>
				{drawQuery.isLoading ? <DrawSkeleton /> : draw ? (
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

			{/* ─── Charity section ─── */}
			<section>
				<h2 style={{ marginBottom: 10 }}>Your Charity</h2>
				{profileQuery.isLoading ? <CharitySkeleton /> : profile?.selected_charity ? (
					<Card padding={18}>
						{selectedCharityImage ? (
							<img
								src={selectedCharityImage}
								alt={profile.selected_charity.name}
								style={{
									width: '100%',
									height: '160px',
									objectFit: 'cover',
									borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
								}}
							/>
						) : (
							<div style={{
								width: '100%',
								height: '160px',
								background: 'var(--color-surface-2)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: '48px',
								borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
							}}>
								⛳
							</div>
						)}
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
