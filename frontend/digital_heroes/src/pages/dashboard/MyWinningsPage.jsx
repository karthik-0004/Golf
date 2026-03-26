import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import toast from 'react-hot-toast'

import { getMyWinnings, uploadProof } from '../../api/drawApi'
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

const matchBadgeMeta = {
	'5_match': { text: '5 Match 🏆', variant: 'success' },
	'4_match': { text: '4 Match 🥈', variant: 'info' },
	'3_match': { text: '3 Match 🥉', variant: 'warning' },
}

const MyWinningsPage = () => {
	const queryClient = useQueryClient()
	const [fileByWinner, setFileByWinner] = useState({})

	const winningsQuery = useQuery({
		queryKey: ['my-winnings'],
		queryFn: async () => (await getMyWinnings()).data,
	})

	const proofMutation = useMutation({
		mutationFn: ({ id, formData }) => uploadProof(id, formData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['my-winnings'] })
			toast.success('Proof uploaded successfully.')
		},
		onError: (error) => {
			const detail =
				error?.response?.data?.proof_screenshot?.[0] ||
				error?.response?.data?.detail
			toast.error(detail || 'Unable to upload proof.')
		},
	})

	const winnings = Array.isArray(winningsQuery.data?.winnings) ? winningsQuery.data.winnings : []

	const stats = useMemo(() => {
		const totalWon = winnings.reduce((sum, item) => sum + Number(item.prize_amount || 0), 0)
		const paidOut = winnings
			.filter((item) => item.payment_status === 'paid')
			.reduce((sum, item) => sum + Number(item.prize_amount || 0), 0)
		const pending = winnings
			.filter((item) => item.payment_status !== 'paid')
			.reduce((sum, item) => sum + Number(item.prize_amount || 0), 0)
		return { totalWon, paidOut, pending }
	}, [winnings])

	const handleFileChange = (winnerId, file) => {
		setFileByWinner((prev) => ({ ...prev, [winnerId]: file }))
	}

	const submitProof = (winner) => {
		const selectedFile = fileByWinner[winner.id]
		if (!selectedFile) {
			toast.error('Please choose an image file first.')
			return
		}

		const formData = new FormData()
		formData.append('proof_screenshot', selectedFile)
		proofMutation.mutate({ id: winner.id, formData })
	}

	if (winningsQuery.isLoading) {
		return (
			<div className="dashboard-loading">
				<Spinner size="lg" />
			</div>
		)
	}

	if (winningsQuery.isError) {
		return (
			<div className="dashboard-error">
				<p>Unable to load winnings.</p>
				<Button onClick={() => winningsQuery.refetch()}>Retry</Button>
			</div>
		)
	}

	return (
		<SubscriptionGuard>
			<motion.div className="dashboard-page" {...pageMotion}>
			<header className="dashboard-header">
				<h1>My Winnings</h1>
				<p>Your prize history and payment status</p>
			</header>

			<section className="dashboard-grid-3">
				<Card padding={16}>
					<p className="dashboard-card-title">Total Won</p>
					<p className="dashboard-big-value">{formatCurrency(stats.totalWon)}</p>
				</Card>
				<Card padding={16}>
					<p className="dashboard-card-title">Paid Out</p>
					<p className="dashboard-big-value">{formatCurrency(stats.paidOut)}</p>
				</Card>
				<Card padding={16}>
					<p className="dashboard-card-title">Pending</p>
					<p className="dashboard-big-value">{formatCurrency(stats.pending)}</p>
				</Card>
			</section>

			<section>
				{!winnings.length ? (
					<Card padding={24}>
						<div style={{ display: 'grid', gap: 8, justifyItems: 'center', textAlign: 'center' }}>
							<Trophy size={34} color="var(--color-accent)" />
							<p className="dashboard-subtle">No winnings yet — but your next draw could be the one! 🎯</p>
						</div>
					</Card>
				) : (
					<div style={{ display: 'grid', gap: 12 }}>
						{winnings.map((winner) => {
							const meta = matchBadgeMeta[winner.match_type] || { text: winner.match_type, variant: 'default' }
							const drawLabel = `${getMonthName(Number(winner.draw?.month || 1))} ${winner.draw?.year || ''}`

							return (
								<Card key={winner.id} padding={18}>
									<div
										style={{
											display: 'grid',
											gridTemplateColumns: 'auto 1fr auto',
											gap: 14,
											alignItems: 'center',
										}}
									>
										<Badge variant={meta.variant}>{meta.text}</Badge>

										<div>
											<p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{drawLabel}</p>
											<p className="dashboard-big-value">{formatCurrency(Number(winner.prize_amount || 0))}</p>
										</div>

										<div className="dashboard-badge-stack">
											<Badge
												variant={
													winner.verification_status === 'approved'
														? 'success'
														: winner.verification_status === 'rejected'
															? 'error'
															: 'warning'
												}
											>
												Verification: {winner.verification_status}
											</Badge>
											<Badge variant={winner.payment_status === 'paid' ? 'success' : 'warning'}>
												Payment: {winner.payment_status}
											</Badge>
										</div>
									</div>

									{winner.verification_status === 'pending' ? (
										<div
											style={{
												marginTop: 14,
												borderTop: '1px solid var(--color-border)',
												paddingTop: 14,
												display: 'grid',
												gap: 10,
											}}
										>
											<p className="dashboard-subtle">Verification required — upload your score screenshot</p>
											<input
												type="file"
												accept="image/*"
												onChange={(event) => handleFileChange(winner.id, event.target.files?.[0])}
											/>
											<div>
												<Button
													onClick={() => submitProof(winner)}
													loading={proofMutation.isPending}
												>
													Upload Proof
												</Button>
											</div>
										</div>
									) : null}

									{winner.verification_status === 'rejected' ? (
										<div
											style={{
												marginTop: 12,
												borderRadius: 'var(--radius-sm)',
												border: '1px solid rgba(239,68,68,0.45)',
												background: 'rgba(239,68,68,0.1)',
												color: '#fca5a5',
												padding: 12,
											}}
										>
											<p style={{ fontWeight: 600 }}>Verification rejected. Contact support.</p>
											{winner.admin_notes ? <p style={{ marginTop: 6 }}>{winner.admin_notes}</p> : null}
										</div>
									) : null}
								</Card>
							)
						})}
					</div>
				)}
			</section>
			</motion.div>
		</SubscriptionGuard>
	)
}

export default MyWinningsPage
