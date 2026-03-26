import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

import { addScore, deleteScore, getScores, updateScore } from '../../api/scoresApi'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import SubscriptionGuard from '../../components/protected/SubscriptionGuard'
import { formatDate } from '../../utils/formatters'
import './dashboard-pages.css'

const pageMotion = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.35, ease: 'easeOut' },
}

const scoreColorClass = (score) => {
	if (score < 20) return 'dashboard-score-red'
	if (score <= 30) return 'dashboard-score-orange'
	if (score <= 40) return 'dashboard-score-green'
	return 'dashboard-score-lime'
}

const ScoresPage = () => {
	const queryClient = useQueryClient()
	const [editingId, setEditingId] = useState(null)
	const [editingData, setEditingData] = useState({ score: '', date_played: '' })
	const [deletingRow, setDeletingRow] = useState(null)

	const { register, handleSubmit, reset, formState: { errors } } = useForm({
		defaultValues: {
			score: '',
			date_played: '',
		},
	})

	const scoresQuery = useQuery({
		queryKey: ['my-scores'],
		queryFn: async () => (await getScores()).data,
	})

	const addScoreMutation = useMutation({
		mutationFn: (payload) => addScore(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['my-scores'] })
			queryClient.invalidateQueries({ queryKey: ['my-entries'] })
			toast.success('Score added successfully.')
			reset()
		},
		onError: (error) => {
			const detail = error?.response?.data?.score?.[0] || error?.response?.data?.detail
			toast.error(detail || 'Unable to add score.')
		},
	})

	const updateScoreMutation = useMutation({
		mutationFn: ({ id, payload }) => updateScore(id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['my-scores'] })
			queryClient.invalidateQueries({ queryKey: ['my-entries'] })
			toast.success('Score updated.')
			setEditingId(null)
		},
		onError: (error) => {
			const detail = error?.response?.data?.score?.[0] || error?.response?.data?.detail
			toast.error(detail || 'Unable to update score.')
		},
	})

	const deleteScoreMutation = useMutation({
		mutationFn: (id) => deleteScore(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['my-scores'] })
			queryClient.invalidateQueries({ queryKey: ['my-entries'] })
			toast.success('Score deleted.')
			setDeletingRow(null)
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail
			toast.error(detail || 'Unable to delete score.')
		},
	})

	const scores = Array.isArray(scoresQuery.data) ? scoresQuery.data : []

	const oldestScore = useMemo(() => {
		if (!scores.length) return null
		return [...scores].sort((a, b) => new Date(a.date_played) - new Date(b.date_played))[0]
	}, [scores])

	const onSubmitAdd = (values) => {
		const parsedScore = Number(values.score)
		if (!parsedScore || parsedScore < 1 || parsedScore > 45) {
			toast.error('Score must be between 1 and 45.')
			return
		}
		if (!values.date_played) {
			toast.error('Date played is required.')
			return
		}
		if (new Date(values.date_played) > new Date()) {
			toast.error('Date played cannot be in the future.')
			return
		}

		addScoreMutation.mutate({
			score: parsedScore,
			date_played: values.date_played,
		})
	}

	const beginEdit = (row) => {
		setEditingId(row.id)
		setEditingData({
			score: row.score,
			date_played: row.date_played,
		})
	}

	const saveEdit = () => {
		const score = Number(editingData.score)
		if (!score || score < 1 || score > 45) {
			toast.error('Score must be between 1 and 45.')
			return
		}
		if (!editingData.date_played) {
			toast.error('Please choose a valid date played.')
			return
		}
		if (new Date(editingData.date_played) > new Date()) {
			toast.error('Date played cannot be in the future.')
			return
		}
		updateScoreMutation.mutate({
			id: editingId,
			payload: { score, date_played: editingData.date_played },
		})
	}

	if (scoresQuery.isLoading) {
		return (
			<div className="dashboard-loading">
				<Spinner size="lg" />
			</div>
		)
	}

	if (scoresQuery.isError) {
		return (
			<div className="dashboard-error">
				<p>Unable to load your scores.</p>
				<Button onClick={() => scoresQuery.refetch()}>Retry</Button>
			</div>
		)
	}

	return (
		<SubscriptionGuard>
			<motion.div className="dashboard-page" {...pageMotion}>
			<header className="dashboard-header">
				<h1>My Golf Scores</h1>
				<p>Your last 5 Stableford scores. New scores replace the oldest.</p>
			</header>

			<section>
				{scores.length ? (
					<div className="dashboard-table-wrap">
						<table className="dashboard-table">
							<thead>
								<tr>
									<th>#</th>
									<th>Score</th>
									<th>Date Played</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{scores.map((row, index) => {
									const inEdit = editingId === row.id
									return (
										<tr key={row.id}>
											<td>{index + 1}</td>
											<td>
												{inEdit ? (
													<input
														type="number"
														min={1}
														max={45}
														value={editingData.score}
														onChange={(event) => setEditingData((prev) => ({ ...prev, score: event.target.value }))}
														style={{
															width: 90,
															background: 'var(--color-surface-2)',
															border: '1px solid var(--color-border)',
															color: 'var(--color-text)',
															borderRadius: 'var(--radius-sm)',
															padding: '6px 8px',
														}}
													/>
												) : (
													<span className={`dashboard-score-value ${scoreColorClass(Number(row.score))}`}>
														{row.score}
													</span>
												)}
											</td>
											<td>
												{inEdit ? (
													<input
														type="date"
														max={new Date().toISOString().slice(0, 10)}
														value={editingData.date_played}
														onChange={(event) => setEditingData((prev) => ({ ...prev, date_played: event.target.value }))}
														style={{
															background: 'var(--color-surface-2)',
															border: '1px solid var(--color-border)',
															color: 'var(--color-text)',
															borderRadius: 'var(--radius-sm)',
															padding: '6px 8px',
														}}
													/>
												) : (
													formatDate(row.date_played)
												)}
											</td>
											<td>
												{inEdit ? (
													<div style={{ display: 'flex', gap: 8 }}>
														<Button size="sm" onClick={saveEdit} loading={updateScoreMutation.isPending}>
															Save
														</Button>
														<Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
															Cancel
														</Button>
													</div>
												) : (
													<div style={{ display: 'flex', gap: 8 }}>
														<Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => beginEdit(row)}>
															Edit
														</Button>
														<Button
															size="sm"
															variant="ghost"
															icon={<Trash2 size={14} />}
															onClick={() => setDeletingRow(row)}
														>
															Delete
														</Button>
													</div>
												)}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				) : (
					<Card padding={18}>
						<p className="dashboard-subtle">No scores yet. Add your first one below.</p>
					</Card>
				)}
			</section>

			<section>
				<Card padding={20}>
					<h2 style={{ marginBottom: 8 }}>Add Score</h2>

					{scores.length >= 5 && oldestScore ? (
						<div className="dashboard-warning-box" style={{ marginBottom: 12 }}>
							Adding a new score will remove your oldest score (dated {formatDate(oldestScore.date_played)}).
						</div>
					) : null}

					<form onSubmit={handleSubmit(onSubmitAdd)} style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
						<Input
							label="Score"
							name="score"
							type="number"
							placeholder="e.g. 34"
							helperText="Stableford score between 1 and 45"
							error={errors.score?.message}
							register={register}
						/>

						<Input
							label="Date Played"
							name="date_played"
							type="date"
							error={errors.date_played?.message}
							register={register}
						/>

						<div>
							<Button type="submit" loading={addScoreMutation.isPending}>Add Score</Button>
						</div>
					</form>
				</Card>
			</section>

			<section>
				<div className="dashboard-info-box">
					<p style={{ marginBottom: 8, fontWeight: 600 }}>ℹ️ How scores work in draws:</p>
					<p>• Only your 5 most recent scores are kept</p>
					<p>• Each score is a number between 1-45 in Stableford format</p>
					<p>• Your 5 scores are used as your draw entry numbers</p>
					<p>• When a new score is added, the oldest is automatically removed</p>
				</div>
			</section>

			<Modal
				isOpen={Boolean(deletingRow)}
				onClose={() => setDeletingRow(null)}
				title="Delete score"
				size="sm"
			>
				<p style={{ color: 'var(--color-text-secondary)', marginBottom: 14 }}>
					Are you sure you want to remove this score?
				</p>
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
					<Button variant="ghost" onClick={() => setDeletingRow(null)}>
						Cancel
					</Button>
					<Button
						variant="danger"
						loading={deleteScoreMutation.isPending}
						onClick={() => deleteScoreMutation.mutate(deletingRow.id)}
					>
						Delete
					</Button>
				</div>
			</Modal>
			</motion.div>
		</SubscriptionGuard>
	)
}

export default ScoresPage
