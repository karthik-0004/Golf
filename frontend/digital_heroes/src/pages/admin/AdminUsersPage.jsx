import { useEffect, useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

import {
	adminAddUserScore,
	adminDeleteUserScore,
	adminGetUserDetail,
	adminGetUserScores,
	adminGetUsers,
	adminUpdateUser,
} from '../../api/drawApi'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { formatDate } from '../../utils/formatters'
import './admin-pages.css'

const pageMotion = {
	initial: { opacity: 0, y: 16 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.3, ease: 'easeOut' },
}

const PAGE_SIZE = 20

const initialsForUser = (user) => {
	const first = user?.first_name?.trim()?.[0] || ''
	const last = user?.last_name?.trim()?.[0] || ''
	const fallback = user?.username?.trim()?.[0] || user?.email?.trim()?.[0] || 'U'
	return `${first}${last}`.toUpperCase() || fallback.toUpperCase()
}

const statusVariant = (status) => {
	if (status === 'active') return 'success'
	if (status === 'lapsed') return 'warning'
	if (status === 'cancelled') return 'error'
	return 'default'
}

const AdminUsersPage = () => {
	const queryClient = useQueryClient()
	const [search, setSearch] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [subscriberFilter, setSubscriberFilter] = useState('all')
	const [page, setPage] = useState(1)

	const [detailUserId, setDetailUserId] = useState(null)
	const [detailTab, setDetailTab] = useState('Profile')
	const [editUser, setEditUser] = useState(null)
	const [deleteScorePayload, setDeleteScorePayload] = useState(null)

	const [detailForm, setDetailForm] = useState({ is_subscriber: false, subscription_status: 'inactive' })
	const [newScore, setNewScore] = useState({ score: '', date_played: '' })

	const { register, handleSubmit, reset } = useForm()

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search)
			setPage(1)
		}, 300)
		return () => clearTimeout(timer)
	}, [search])

	const params = useMemo(() => {
		const query = {}
		if (debouncedSearch) query.search = debouncedSearch
		if (subscriberFilter === 'active') query.is_subscriber = true
		if (subscriberFilter === 'inactive') query.is_subscriber = false
		return query
	}, [debouncedSearch, subscriberFilter])

	const usersQuery = useQuery({
		queryKey: ['admin-users', params],
		queryFn: async () => (await adminGetUsers(params)).data,
	})

	const detailQuery = useQuery({
		queryKey: ['admin-user-detail', detailUserId],
		queryFn: async () => (await adminGetUserDetail(detailUserId)).data,
		enabled: Boolean(detailUserId),
	})

	const scoresQuery = useQuery({
		queryKey: ['admin-user-scores', detailUserId],
		queryFn: async () => (await adminGetUserScores(detailUserId)).data,
		enabled: Boolean(detailUserId && detailTab === 'Scores'),
	})

	useEffect(() => {
		if (!editUser) return
		reset({
			first_name: editUser.first_name || '',
			last_name: editUser.last_name || '',
			subscription_status: editUser.subscription_status || 'inactive',
			is_subscriber: Boolean(editUser.is_subscriber),
		})
	}, [editUser, reset])

	useEffect(() => {
		if (!detailQuery.data) return
		setDetailForm({
			is_subscriber: Boolean(detailQuery.data.is_subscriber),
			subscription_status: detailQuery.data.subscription_status || 'inactive',
		})
	}, [detailQuery.data])

	const updateUserMutation = useMutation({
		mutationFn: ({ id, payload }) => adminUpdateUser(id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-users'] })
			queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] })
			toast.success('User updated.')
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail || 'Unable to update user.'
			toast.error(detail)
		},
	})

	const addScoreMutation = useMutation({
		mutationFn: ({ id, payload }) => adminAddUserScore(id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-user-scores'] })
			queryClient.invalidateQueries({ queryKey: ['admin-users'] })
			toast.success('Score added.')
			setNewScore({ score: '', date_played: '' })
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail || error?.response?.data?.score?.[0]
			toast.error(detail || 'Unable to add score.')
		},
	})

	const deleteScoreMutation = useMutation({
		mutationFn: ({ userId, scoreId }) => adminDeleteUserScore(userId, scoreId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-user-scores'] })
			queryClient.invalidateQueries({ queryKey: ['admin-users'] })
			toast.success('Score removed.')
			setDeleteScorePayload(null)
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail || 'Unable to delete score.'
			toast.error(detail)
		},
	})

	const users = Array.isArray(usersQuery.data) ? usersQuery.data : []
	const start = (page - 1) * PAGE_SIZE
	const pagedUsers = users.slice(start, start + PAGE_SIZE)
	const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE))

	const openDetail = (userId) => {
		setDetailTab('Profile')
		setDetailUserId(userId)
	}

	const saveDetailSubscription = () => {
		if (!detailUserId) return
		updateUserMutation.mutate({ id: detailUserId, payload: detailForm })
	}

	const saveEditUser = (values) => {
		updateUserMutation.mutate({
			id: editUser.id,
			payload: {
				first_name: values.first_name,
				last_name: values.last_name,
				subscription_status: values.subscription_status,
				is_subscriber: Boolean(values.is_subscriber),
			},
		})
		setEditUser(null)
	}

	const addScoreForUser = () => {
		if (!detailUserId) return
		const score = Number(newScore.score)
		if (!score || score < 1 || score > 45) {
			toast.error('Score must be between 1 and 45.')
			return
		}
		if (!newScore.date_played) {
			toast.error('Date is required.')
			return
		}
		addScoreMutation.mutate({
			id: detailUserId,
			payload: { score, date_played: newScore.date_played },
		})
	}

	if (usersQuery.isLoading) {
		return (
			<div className="admin-loading">
				<div style={{ width: '100%', maxWidth: 1040 }}>
					{Array.from({ length: 6 }).map((_, idx) => (
						<div key={idx} className="admin-skeleton" style={{ height: 44, marginBottom: 8 }} />
					))}
				</div>
			</div>
		)
	}

	if (usersQuery.isError) {
		return (
			<div className="admin-error">
				<p>Unable to load users.</p>
				<Button onClick={() => usersQuery.refetch()}>Retry</Button>
			</div>
		)
	}

	return (
		<motion.div className="admin-page" {...pageMotion}>
			<header className="admin-page-header">
				<div>
					<h1>User Management</h1>
					<p>View and manage all registered users</p>
				</div>
			</header>

			<section className="admin-filters">
				<input
					className="admin-input"
					placeholder="Search by email or name"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					style={{ minWidth: 280 }}
				/>

				<select
					className="admin-select"
					value={subscriberFilter}
					onChange={(event) => {
						setSubscriberFilter(event.target.value)
						setPage(1)
					}}
				>
					<option value="all">All</option>
					<option value="active">Active Subscribers</option>
					<option value="inactive">Inactive</option>
				</select>

				<p className="admin-subtle" style={{ marginLeft: 'auto' }}>{users.length} users</p>
			</section>

			<section>
				<div className="admin-table-wrap">
					<table className="admin-table">
						<thead>
							<tr>
								<th>User</th>
								<th>Plan</th>
								<th>Status</th>
								<th>Charity</th>
								<th>Joined</th>
								<th>Scores</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{pagedUsers.map((user) => (
								<tr key={user.id}>
									<td>
										<div className="admin-row-user">
											<span className="admin-user-avatar">{initialsForUser(user)}</span>
											<div>
												<p style={{ fontWeight: 700 }}>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'User'}</p>
												<small className="admin-subtle">{user.email}</small>
											</div>
										</div>
									</td>
									<td>
										{user.subscription_plan ? (
											<Badge variant="info">{user.subscription_plan}</Badge>
										) : '—'}
									</td>
									<td>
										<Badge variant={statusVariant(user.subscription_status)}>
											{user.subscription_status || 'inactive'}
										</Badge>
									</td>
									<td>{user.selected_charity?.name || 'None'}</td>
									<td>{formatDate(user.created_at)}</td>
									<td>{user.scores_count || 0}</td>
									<td>
										<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
											<Button size="sm" variant="outline" onClick={() => openDetail(user.id)}>
												View
											</Button>
											<Button size="sm" variant="ghost" onClick={() => setEditUser(user)}>
												Edit
											</Button>
										</div>
									</td>
								</tr>
							))}

							{!pagedUsers.length ? (
								<tr>
									<td colSpan={7}>
										<div className="admin-empty">
											<p>No users found.</p>
										</div>
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
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
				isOpen={Boolean(detailUserId)}
				onClose={() => setDetailUserId(null)}
				title="User Details"
				size="lg"
			>
				{detailQuery.isLoading ? (
					<Spinner />
				) : detailQuery.isError ? (
					<p className="admin-subtle">Unable to load user details.</p>
				) : (
					<div style={{ display: 'grid', gap: 12 }}>
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
							{['Profile', 'Subscription', 'Scores'].map((tab) => (
								<button
									key={tab}
									type="button"
									className={`dashboard-tab-btn ${detailTab === tab ? 'dashboard-tab-btn--active' : ''}`}
									onClick={() => setDetailTab(tab)}
								>
									{tab}
								</button>
							))}
						</div>

						{detailTab === 'Profile' ? (
							<div style={{ display: 'grid', gap: 6 }}>
								<p><strong>Name:</strong> {`${detailQuery.data.first_name || ''} ${detailQuery.data.last_name || ''}`.trim() || detailQuery.data.username}</p>
								<p><strong>Email:</strong> {detailQuery.data.email}</p>
								<p><strong>Username:</strong> {detailQuery.data.username || '—'}</p>
								<p><strong>Phone:</strong> {detailQuery.data.phone_number || '—'}</p>
								<p><strong>Joined:</strong> {formatDate(detailQuery.data.created_at)}</p>
								<p><strong>Charity:</strong> {detailQuery.data.selected_charity?.name || 'None'}</p>
							</div>
						) : null}

						{detailTab === 'Subscription' ? (
							<div style={{ display: 'grid', gap: 10 }}>
								<p><strong>Current Plan:</strong> {detailQuery.data.subscription_plan || '—'}</p>
								<p><strong>Start:</strong> {detailQuery.data.subscription_start_date ? formatDate(detailQuery.data.subscription_start_date) : '—'}</p>
								<p><strong>End:</strong> {detailQuery.data.subscription_end_date ? formatDate(detailQuery.data.subscription_end_date) : '—'}</p>

								<label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
									<input
										type="checkbox"
										checked={Boolean(detailForm.is_subscriber)}
										onChange={(event) => setDetailForm((prev) => ({ ...prev, is_subscriber: event.target.checked }))}
									/>
									<span>is_subscriber</span>
								</label>

								<select
									className="admin-select"
									value={detailForm.subscription_status}
									onChange={(event) => setDetailForm((prev) => ({ ...prev, subscription_status: event.target.value }))}
								>
									<option value="inactive">inactive</option>
									<option value="active">active</option>
									<option value="cancelled">cancelled</option>
									<option value="lapsed">lapsed</option>
								</select>

								<div>
									<Button onClick={saveDetailSubscription} loading={updateUserMutation.isPending}>
										Save
									</Button>
								</div>
							</div>
						) : null}

						{detailTab === 'Scores' ? (
							<div style={{ display: 'grid', gap: 10 }}>
								{scoresQuery.isLoading ? (
									<Spinner />
								) : (
									<>
										<div style={{ display: 'grid', gap: 8 }}>
											{(scoresQuery.data || []).map((score) => (
												<div
													key={score.id}
													style={{
														border: '1px solid var(--color-border)',
														borderRadius: 'var(--radius-sm)',
														padding: 10,
														display: 'flex',
														justifyContent: 'space-between',
														alignItems: 'center',
													}}
												>
													<span>
														<strong>{score.score}</strong> · {formatDate(score.date_played)}
													</span>
													<Button
														size="sm"
														variant="ghost"
														onClick={() => setDeleteScorePayload({ userId: detailUserId, scoreId: score.id })}
													>
														Delete
													</Button>
												</div>
											))}

											{!scoresQuery.data?.length ? (
												<p className="admin-subtle">No scores yet for this user.</p>
											) : null}
										</div>

										<Card padding={14}>
											<h4 style={{ marginBottom: 8 }}>Add Score</h4>
											<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
												<input
													type="number"
													min={1}
													max={45}
													placeholder="Score"
													value={newScore.score}
													onChange={(event) => setNewScore((prev) => ({ ...prev, score: event.target.value }))}
													className="admin-input"
												/>
												<input
													type="date"
													value={newScore.date_played}
													onChange={(event) => setNewScore((prev) => ({ ...prev, date_played: event.target.value }))}
													className="admin-input"
												/>
												<Button size="sm" onClick={addScoreForUser} loading={addScoreMutation.isPending}>
													Add
												</Button>
											</div>
										</Card>
									</>
								)}
							</div>
						) : null}
					</div>
				)}
			</Modal>

			<Modal isOpen={Boolean(editUser)} onClose={() => setEditUser(null)} title="Edit User" size="md">
				{editUser ? (
					<form onSubmit={handleSubmit(saveEditUser)} style={{ display: 'grid', gap: 10 }}>
						<Input label="First Name" name="first_name" register={register} />
						<Input label="Last Name" name="last_name" register={register} />
						<label>
							<span className="admin-subtle">Subscription Status</span>
							<select className="admin-select" {...register('subscription_status')} style={{ width: '100%', marginTop: 4 }}>
								<option value="inactive">inactive</option>
								<option value="active">active</option>
								<option value="cancelled">cancelled</option>
								<option value="lapsed">lapsed</option>
							</select>
						</label>

						<label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
							<input type="checkbox" {...register('is_subscriber')} />
							<span>is_subscriber</span>
						</label>

						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
							<Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
							<Button type="submit" loading={updateUserMutation.isPending}>Save Changes</Button>
						</div>
					</form>
				) : null}
			</Modal>

			<Modal
				isOpen={Boolean(deleteScorePayload)}
				onClose={() => setDeleteScorePayload(null)}
				title="Delete score"
				size="sm"
			>
				<p className="admin-subtle" style={{ marginBottom: 12 }}>Are you sure you want to delete this score?</p>
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
					<Button variant="ghost" onClick={() => setDeleteScorePayload(null)}>Cancel</Button>
					<Button
						variant="danger"
						loading={deleteScoreMutation.isPending}
						onClick={() => deleteScoreMutation.mutate(deleteScorePayload)}
					>
						Delete
					</Button>
				</div>
			</Modal>
		</motion.div>
	)
}

export default AdminUsersPage
