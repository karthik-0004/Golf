import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'

import { getMyEntries, getMyWinnings } from '../../api/drawApi'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import SubscriptionGuard from '../../components/protected/SubscriptionGuard'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency, getMonthName } from '../../utils/formatters'
import './dashboard-pages.css'

const pageMotion = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.35, ease: 'easeOut' },
}

const MyDrawsPage = () => {
	const entriesQuery = useQuery({
		queryKey: ['my-entries'],
		queryFn: async () => (await getMyEntries()).data,
	})

	const winningsQuery = useQuery({
		queryKey: ['my-winnings'],
		queryFn: async () => (await getMyWinnings()).data,
	})

	const entries = useMemo(() => {
		const data = Array.isArray(entriesQuery.data) ? entriesQuery.data : []
		return [...data].sort((a, b) => {
			const yearDiff = Number(b.draw?.year || 0) - Number(a.draw?.year || 0)
			if (yearDiff !== 0) return yearDiff
			return Number(b.draw?.month || 0) - Number(a.draw?.month || 0)
		})
	}, [entriesQuery.data])

	const winnings = Array.isArray(winningsQuery.data?.winnings) ? winningsQuery.data.winnings : []
	const winningsByDraw = useMemo(
		() => winnings.reduce((acc, item) => ({ ...acc, [item.draw?.id]: item }), {}),
		[winnings],
	)

	const totalDraws = entries.length
	const totalWins = entries.filter((item) => item.is_winner).length
	const bestMatch = entries.reduce((max, item) => Math.max(max, Number(item.match_count || 0)), 0)

	if (entriesQuery.isLoading || winningsQuery.isLoading) {
		return (
			<div className="dashboard-loading">
				<Spinner size="lg" />
			</div>
		)
	}

	if (entriesQuery.isError || winningsQuery.isError) {
		return (
			<div className="dashboard-error">
				<p>Unable to load draw history.</p>
				<Button
					onClick={() => {
						entriesQuery.refetch()
						winningsQuery.refetch()
					}}
				>
					Retry
				</Button>
			</div>
		)
	}

	return (
		<SubscriptionGuard>
			<motion.div className="dashboard-page" {...pageMotion}>
			<header className="dashboard-header">
				<h1>My Draw History</h1>
				<p>Every draw you&apos;ve participated in</p>
			</header>

			<section className="dashboard-grid-3">
				<Card padding={16}>
					<p className="dashboard-card-title">Total Draws Entered</p>
					<p className="dashboard-big-value">{totalDraws}</p>
				</Card>
				<Card padding={16}>
					<p className="dashboard-card-title">Times Won</p>
					<p className="dashboard-big-value">{totalWins}</p>
				</Card>
				<Card padding={16}>
					<p className="dashboard-card-title">Best Match</p>
					<p className="dashboard-big-value">{bestMatch} / 5</p>
				</Card>
			</section>

			<section>
				{!entries.length ? (
					<Card padding={18}>
						<p className="dashboard-subtle">
							You haven&apos;t entered any draws yet. Add scores to get entered automatically each month.
						</p>
					</Card>
				) : (
					<div className="dashboard-table-wrap">
						<table className="dashboard-table">
							<thead>
								<tr>
									<th>Month / Year</th>
									<th>Your Scores</th>
									<th>Drawn Numbers</th>
									<th>Matches</th>
									<th>Result</th>
									<th>Prize</th>
								</tr>
							</thead>
							<tbody>
								{entries.map((entry) => {
									const rowDraw = entry.draw || {}
									const drawLabel = `${getMonthName(Number(rowDraw.month || 1))} ${rowDraw.year || ''}`
									const snapshotScores = Array.isArray(entry.scores_snapshot)
										? entry.scores_snapshot.map((item) => Number(item?.score ?? item))
										: []
									const drawnNumbers = Array.isArray(rowDraw.drawn_numbers) ? rowDraw.drawn_numbers : []
									const status = rowDraw.status
									const winnerData = winningsByDraw[rowDraw.id]

									return (
										<tr key={entry.id}>
											<td>{drawLabel}</td>
											<td>
												<div className="dashboard-pill-row">
													{snapshotScores.map((num, index) => (
														<span key={`${entry.id}-score-${index}`} className="dashboard-number-chip">
															{num}
														</span>
													))}
												</div>
											</td>
											<td>
												<div className="dashboard-pill-row">
													{drawnNumbers.length
														? drawnNumbers.map((num, index) => (
																<span
																	key={`${entry.id}-draw-${index}`}
																	className={`dashboard-number-chip ${snapshotScores.includes(Number(num)) ? 'dashboard-number-chip--accent' : ''}`}
																>
																	{num}
																</span>
															))
														: <span className="dashboard-subtle">Pending</span>}
												</div>
											</td>
											<td>{Number(entry.match_count || 0)} / 5</td>
											<td>
												{status !== 'published' ? (
													<Badge variant="warning">Pending</Badge>
												) : entry.is_winner ? (
													<Badge variant="success">Winner 🏆</Badge>
												) : (
													<Badge>No Match</Badge>
												)}
											</td>
											<td>
												{winnerData?.prize_amount
													? formatCurrency(Number(winnerData.prize_amount))
													: '—'}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</section>
			</motion.div>
		</SubscriptionGuard>
	)
}

export default MyDrawsPage
