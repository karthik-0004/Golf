import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Heart, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

import {
	adminCreateCharity,
	adminDeleteCharity,
	adminGetCharities,
	adminGetUsers,
	adminUpdateCharity,
} from '../../api/drawApi'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { getCharityImage } from '../../utils/charityImages'
import './admin-pages.css'

const pageMotion = {
	initial: { opacity: 0, y: 16 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.3, ease: 'easeOut' },
}

const slugify = (value) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')

const buildCharityPayload = (form) => {
	const formData = new FormData()
	formData.append('name', form.name)
	formData.append('slug', form.slug)
	formData.append('description', form.description)
	formData.append('website_url', form.website_url || '')
	formData.append('upcoming_events', form.upcoming_events || '')
	formData.append('is_featured', String(Boolean(form.is_featured)))
	formData.append('is_active', String(Boolean(form.is_active)))
	if (form.logo instanceof File) formData.append('logo', form.logo)
	if (form.banner_image instanceof File) formData.append('banner_image', form.banner_image)
	return formData
}

const AdminCharitiesPage = () => {
	const queryClient = useQueryClient()
	const [modalOpen, setModalOpen] = useState(false)
	const [editing, setEditing] = useState(null)
	const [deleteTarget, setDeleteTarget] = useState(null)
	const [form, setForm] = useState({
		name: '',
		slug: '',
		description: '',
		website_url: '',
		logo: null,
		banner_image: null,
		upcoming_events: '',
		is_featured: false,
		is_active: true,
	})

	const charitiesQuery = useQuery({
		queryKey: ['admin-charities'],
		queryFn: async () => (await adminGetCharities()).data,
	})

	const usersQuery = useQuery({
		queryKey: ['admin-users', {}],
		queryFn: async () => (await adminGetUsers({})).data,
	})

	const createMutation = useMutation({
		mutationFn: (payload) => adminCreateCharity(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-charities'] })
			toast.success('Charity added.')
			setModalOpen(false)
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail || 'Unable to create charity.'
			toast.error(detail)
		},
	})

	const updateMutation = useMutation({
		mutationFn: ({ id, payload }) => adminUpdateCharity(id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-charities'] })
			queryClient.invalidateQueries({ queryKey: ['admin-users'] })
			toast.success('Charity updated.')
			setModalOpen(false)
			setEditing(null)
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail || 'Unable to update charity.'
			toast.error(detail)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (id) => adminDeleteCharity(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-charities'] })
			queryClient.invalidateQueries({ queryKey: ['admin-users'] })
			toast.success('Charity deleted.')
			setDeleteTarget(null)
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail || 'Unable to delete charity.'
			toast.error(detail)
		},
	})

	const charities = Array.isArray(charitiesQuery.data) ? charitiesQuery.data : []
	const users = Array.isArray(usersQuery.data) ? usersQuery.data : []

	const supportersByCharity = useMemo(() => {
		const countMap = {}
		users.forEach((user) => {
			const id = user.selected_charity?.id
			if (!id) return
			countMap[id] = (countMap[id] || 0) + 1
		})
		return countMap
	}, [users])

	const openCreate = () => {
		setEditing(null)
		setForm({
			name: '',
			slug: '',
			description: '',
			website_url: '',
			logo: null,
			banner_image: null,
			upcoming_events: '',
			is_featured: false,
			is_active: true,
		})
		setModalOpen(true)
	}

	const openEdit = (charity) => {
		setEditing(charity)
		setForm({
			name: charity.name || '',
			slug: charity.slug || '',
			description: charity.description || '',
			website_url: charity.website_url || '',
			logo: null,
			banner_image: null,
			upcoming_events: charity.upcoming_events || '',
			is_featured: Boolean(charity.is_featured),
			is_active: Boolean(charity.is_active),
		})
		setModalOpen(true)
	}

	const submitForm = () => {
		if (!form.name.trim() || !form.slug.trim() || !form.description.trim()) {
			toast.error('Name, slug, and description are required.')
			return
		}
		const payload = buildCharityPayload(form)
		if (editing) {
			updateMutation.mutate({ id: editing.id, payload })
		} else {
			createMutation.mutate(payload)
		}
	}

	const toggleActive = (charity) => {
		const payload = new FormData()
		payload.append('name', charity.name)
		payload.append('slug', charity.slug)
		payload.append('description', charity.description || '')
		payload.append('website_url', charity.website_url || '')
		payload.append('upcoming_events', charity.upcoming_events || '')
		payload.append('is_featured', String(Boolean(charity.is_featured)))
		payload.append('is_active', String(!charity.is_active))
		updateMutation.mutate({ id: charity.id, payload })
	}

	if (charitiesQuery.isLoading || usersQuery.isLoading) {
		return (
			<div className="admin-loading">
				<Spinner size="lg" />
			</div>
		)
	}

	if (charitiesQuery.isError || usersQuery.isError) {
		return (
			<div className="admin-error">
				<p>Unable to load charities.</p>
				<Button
					onClick={() => {
						charitiesQuery.refetch()
						usersQuery.refetch()
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
					<h1>Charity Management</h1>
				</div>
				<Button icon={<Plus size={16} />} onClick={openCreate}>
					Add Charity
				</Button>
			</header>

			{!charities.length ? (
				<div className="admin-empty">
					<p>Add your first charity to get started.</p>
					<Button onClick={openCreate}>Add Charity</Button>
				</div>
			) : (
				<section className="admin-grid-3">
					{charities.map((charity) => {
						const imgSrc = getCharityImage(charity)
						return (
						<article key={charity.id} className="admin-charity-card">
							<div className="admin-charity-media">
								{imgSrc ? (
									<img
										src={imgSrc}
										alt={charity.name}
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
							</div>

							<div style={{ padding: 12, display: 'grid', gap: 8 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
									<h3 style={{ fontSize: 20 }}>{charity.name}</h3>
									{charity.is_featured ? <Badge variant="warning">⭐ Featured</Badge> : null}
								</div>

								<label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
									<input
										type="checkbox"
										checked={Boolean(charity.is_active)}
										onChange={() => toggleActive(charity)}
									/>
									<span className="admin-subtle">Active</span>
								</label>

								<p className="admin-subtle" style={{
									display: '-webkit-box',
									WebkitLineClamp: 2,
									WebkitBoxOrient: 'vertical',
									overflow: 'hidden',
								}}>
									{charity.description}
								</p>

								<p className="admin-subtle">
									{supportersByCharity[charity.id] || 0} members supporting this charity
								</p>

								<div style={{ display: 'flex', gap: 8 }}>
									<Button size="sm" variant="outline" onClick={() => openEdit(charity)}>
										Edit
									</Button>
									<Button size="sm" variant="ghost" onClick={() => setDeleteTarget(charity)}>
										Delete
									</Button>
								</div>
							</div>
						</article>
					)})}
				</section>
			)}

			<Modal
				isOpen={modalOpen}
				onClose={() => {
					setModalOpen(false)
					setEditing(null)
				}}
				title={editing ? 'Edit Charity' : 'Add Charity'}
				size="lg"
			>
				<div style={{ display: 'grid', gap: 10 }}>
					<label>
						<span className="admin-subtle">Name</span>
						<input
							className="admin-input"
							value={form.name}
							onChange={(event) => {
								const value = event.target.value
								setForm((prev) => ({
									...prev,
									name: value,
									slug: prev.slug && editing ? prev.slug : slugify(value),
								}))
							}}
							style={{ width: '100%', marginTop: 4 }}
						/>
					</label>

					<label>
						<span className="admin-subtle">Slug</span>
						<input
							className="admin-input"
							value={form.slug}
							onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
							style={{ width: '100%', marginTop: 4 }}
						/>
						<p className="admin-subtle" style={{ marginTop: 3 }}>URL: /charities/{form.slug || 'slug'}</p>
					</label>

					<label>
						<span className="admin-subtle">Description</span>
						<textarea
							className="admin-textarea"
							value={form.description}
							onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
						/>
					</label>

					<label>
						<span className="admin-subtle">Website URL</span>
						<input
							className="admin-input"
							value={form.website_url}
							onChange={(event) => setForm((prev) => ({ ...prev, website_url: event.target.value }))}
							style={{ width: '100%', marginTop: 4 }}
						/>
					</label>

					<div className="admin-grid-2">
						<label>
							<span className="admin-subtle">Logo upload</span>
							<input
								type="file"
								accept="image/*"
								onChange={(event) => setForm((prev) => ({ ...prev, logo: event.target.files?.[0] || null }))}
							/>
						</label>

						<label>
							<span className="admin-subtle">Banner image upload</span>
							<input
								type="file"
								accept="image/*"
								onChange={(event) => setForm((prev) => ({ ...prev, banner_image: event.target.files?.[0] || null }))}
							/>
						</label>
					</div>

					<label>
						<span className="admin-subtle">Upcoming Events</span>
						<textarea
							className="admin-textarea"
							placeholder="Golf day on 15th April 2026..."
							value={form.upcoming_events}
							onChange={(event) => setForm((prev) => ({ ...prev, upcoming_events: event.target.value }))}
						/>
					</label>

					<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
						<label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
							<input
								type="checkbox"
								checked={Boolean(form.is_featured)}
								onChange={(event) => setForm((prev) => ({ ...prev, is_featured: event.target.checked }))}
							/>
							<span>Featured</span>
						</label>

						<label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
							<input
								type="checkbox"
								checked={Boolean(form.is_active)}
								onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
							/>
							<span>Active</span>
						</label>
					</div>

					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
						<Button
							variant="ghost"
							onClick={() => {
								setModalOpen(false)
								setEditing(null)
							}}
						>
							Cancel
						</Button>
						<Button
							loading={createMutation.isPending || updateMutation.isPending}
							onClick={submitForm}
						>
							{editing ? 'Save Changes' : 'Create Charity'}
						</Button>
					</div>
				</div>
			</Modal>

			<Modal
				isOpen={Boolean(deleteTarget)}
				onClose={() => setDeleteTarget(null)}
				title="Delete charity"
				size="sm"
			>
				<p className="admin-subtle" style={{ marginBottom: 12 }}>
					Are you sure you want to delete {deleteTarget?.name}? This will not affect users who have already selected this charity.
				</p>

				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
					<Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
					<Button
						variant="danger"
						loading={deleteMutation.isPending}
						onClick={() => deleteMutation.mutate(deleteTarget.id)}
					>
						Delete
					</Button>
				</div>
			</Modal>
		</motion.div>
	)
}

export default AdminCharitiesPage
