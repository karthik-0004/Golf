import { useEffect, useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { getCharities } from '../../api/charityApi'
import { cancelSubscription, getPlans, getSubscriptionStatus } from '../../api/subscriptionApi'
import { getProfile, selectCharity, updateProfile } from '../../api/userApi'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { getCharityImage } from '../../utils/charityImages'
import { formatCurrency, formatDate } from '../../utils/formatters'
import './dashboard-pages.css'

const pageMotion = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.35, ease: 'easeOut' },
}

const tabs = ['Profile', 'Subscription', 'Charity']

const getProfileInitials = (profile) => {
	const first = profile?.first_name?.trim()?.[0] || ''
	const last = profile?.last_name?.trim()?.[0] || ''
	const fallback = profile?.username?.trim()?.[0] || profile?.email?.trim()?.[0] || 'U'
	return `${first}${last}`.toUpperCase() || fallback.toUpperCase()
}

const statusBadgeVariant = (status) => {
	if (status === 'active') return 'success'
	if (status === 'lapsed') return 'warning'
	if (status === 'cancelled') return 'error'
	return 'default'
}

const SettingsPage = () => {
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [activeTab, setActiveTab] = useState('Profile')
	const [cancelOpen, setCancelOpen] = useState(false)
	const [profileImageFile, setProfileImageFile] = useState(null)
	const [searchTerm, setSearchTerm] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [contributionPercent, setContributionPercent] = useState(10)

	const { register, handleSubmit, reset, formState: { errors } } = useForm()

	const profileQuery = useQuery({
		queryKey: ['profile'],
		queryFn: async () => (await getProfile()).data,
	})

	const subscriptionQuery = useQuery({
		queryKey: ['subscription-status'],
		queryFn: async () => (await getSubscriptionStatus()).data,
	})

	const plansQuery = useQuery({
		queryKey: ['subscription-plans'],
		queryFn: async () => (await getPlans()).data,
	})

	const charitiesQuery = useQuery({
		queryKey: ['charities-search', debouncedSearch],
		queryFn: async () => (await getCharities(debouncedSearch)).data,
	})

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
		return () => clearTimeout(timer)
	}, [searchTerm])

	useEffect(() => {
		if (!profileQuery.data) return
		reset({
			first_name: profileQuery.data.first_name || '',
			last_name: profileQuery.data.last_name || '',
			username: profileQuery.data.username || '',
			phone_number: profileQuery.data.phone_number || '',
			email: profileQuery.data.email || '',
		})
		setContributionPercent(Number(profileQuery.data.charity_contribution_percentage || 10))
	}, [profileQuery.data, reset])

	const updateProfileMutation = useMutation({
		mutationFn: (payload) => updateProfile(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['profile'] })
			toast.success('Profile updated successfully.')
			setProfileImageFile(null)
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail || 'Unable to update profile.'
			toast.error(detail)
		},
	})

	const cancelSubscriptionMutation = useMutation({
		mutationFn: () => cancelSubscription(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['subscription-status'] })
			queryClient.invalidateQueries({ queryKey: ['profile'] })
			toast.success('Subscription cancellation scheduled successfully.')
			setCancelOpen(false)
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail || 'Unable to cancel subscription.'
			toast.error(detail)
		},
	})

	const selectCharityMutation = useMutation({
		mutationFn: (payload) => selectCharity(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['profile'] })
			toast.success('Charity preferences saved.')
		},
		onError: (error) => {
			const detail = error?.response?.data?.detail || 'Unable to update charity.'
			toast.error(detail)
		},
	})

	const profile = profileQuery.data || {}
	const subscription = subscriptionQuery.data || {}
	const charities = Array.isArray(charitiesQuery.data) ? charitiesQuery.data : []

	const currentPlanPrice = useMemo(() => {
		const plans = Array.isArray(plansQuery.data) ? plansQuery.data : []
		const matched = plans.find((item) => item.name === subscription.subscription_plan)
		if (!matched) return subscription.subscription_plan === 'yearly' ? 99 / 12 : 9.99
		return subscription.subscription_plan === 'yearly'
			? Number(matched.price) / 12
			: Number(matched.price)
	}, [plansQuery.data, subscription.subscription_plan])

	const monthlyContribution = useMemo(
		() => (currentPlanPrice * Number(contributionPercent || 10)) / 100,
		[contributionPercent, currentPlanPrice],
	)

	const onSubmitProfile = (values) => {
		const payload = {
			first_name: values.first_name,
			last_name: values.last_name,
			username: values.username,
			phone_number: values.phone_number,
		}
		updateProfileMutation.mutate(payload)
	}

	const uploadProfilePhoto = () => {
		if (!profileImageFile) {
			toast.error('Please select an image first.')
			return
		}
		const formData = new FormData()
		formData.append('profile_picture', profileImageFile)
		updateProfileMutation.mutate(formData)
	}

	const saveContribution = () => {
		const normalized = Math.min(100, Math.max(10, Number(contributionPercent || 10)))
		setContributionPercent(normalized)

		if (profile?.selected_charity?.id) {
			selectCharityMutation.mutate({
				charity_id: profile.selected_charity.id,
				charity_contribution_percentage: normalized,
			})
			return
		}

		updateProfileMutation.mutate({ charity_contribution_percentage: normalized })
	}

	if (profileQuery.isLoading || subscriptionQuery.isLoading) {
		return (
			<div className="dashboard-loading">
				<Spinner size="lg" />
			</div>
		)
	}

	if (profileQuery.isError || subscriptionQuery.isError) {
		return (
			<div className="dashboard-error">
				<p>Unable to load account settings.</p>
				<Button
					onClick={() => {
						profileQuery.refetch()
						subscriptionQuery.refetch()
					}}
				>
					Retry
				</Button>
			</div>
		)
	}

	return (
		<motion.div className="dashboard-page" {...pageMotion}>
			<header className="dashboard-header">
				<h1>Account Settings</h1>
			</header>

			<div className="dashboard-tab-row">
				{tabs.map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => setActiveTab(tab)}
						className={`dashboard-tab-btn ${activeTab === tab ? 'dashboard-tab-btn--active' : ''}`}
					>
						{tab}
					</button>
				))}
			</div>

			{activeTab === 'Profile' ? (
				<Card padding={20}>
					<div style={{ display: 'grid', gap: 16 }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
							<div style={{ position: 'relative', width: 76, height: 76 }}>
								<div
									style={{
										width: 76,
										height: 76,
										borderRadius: '50%',
										border: '1px solid var(--color-border)',
										background: 'var(--color-surface-2)',
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										overflow: 'hidden',
										color: 'var(--color-accent)',
										fontSize: 24,
										fontWeight: 800,
									}}
								>
									{profile.profile_picture ? (
										<img
											src={profile.profile_picture}
											alt="Profile"
											style={{ width: '100%', height: '100%', objectFit: 'cover' }}
										/>
									) : (
										getProfileInitials(profile)
									)}
								</div>
								<input
									id="profile-photo-input"
									type="file"
									accept="image/*"
									onChange={(event) => setProfileImageFile(event.target.files?.[0] || null)}
									style={{ display: 'none' }}
								/>
								<label
									htmlFor="profile-photo-input"
									style={{
										position: 'absolute',
										right: -2,
										bottom: -2,
										width: 28,
										height: 28,
										borderRadius: '50%',
										border: '1px solid var(--color-border)',
										background: 'var(--color-surface)',
										color: 'var(--color-accent)',
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: 16,
										cursor: 'pointer',
									}}
									title="Upload profile picture"
								>
									+
								</label>
							</div>

							<div>
								<Button
									size="sm"
									variant="outline"
									onClick={uploadProfilePhoto}
									loading={updateProfileMutation.isPending}
								>
									Upload Photo
								</Button>
							</div>
						</div>

						<form onSubmit={handleSubmit(onSubmitProfile)} style={{ display: 'grid', gap: 12 }}>
							<div className="dashboard-grid-3">
								<Input
									label="First Name"
									name="first_name"
									register={register}
									error={errors.first_name?.message}
								/>
								<Input
									label="Last Name"
									name="last_name"
									register={register}
									error={errors.last_name?.message}
								/>
							</div>

							<Input
								label="Username"
								name="username"
								register={register}
								error={errors.username?.message}
							/>

							<Input
								label="Phone Number"
								name="phone_number"
								register={register}
								error={errors.phone_number?.message}
							/>

							<Input label="Email" name="email" register={register} disabled />

							<div>
								<Button type="submit" loading={updateProfileMutation.isPending}>
									Save Changes
								</Button>
							</div>
						</form>
					</div>
				</Card>
			) : null}

			{activeTab === 'Subscription' ? (
				<Card padding={20}>
					<div style={{ display: 'grid', gap: 14 }}>
						<div className="dashboard-section-head">
							<h2 style={{ fontSize: 22 }}>Current Subscription</h2>
							<Badge variant={statusBadgeVariant(subscription.subscription_status)}>
								{subscription.subscription_status || 'inactive'}
							</Badge>
						</div>

						<p className="dashboard-subtle">
							Plan: {(subscription.subscription_plan || 'none').toString().replace(/^./, (c) => c.toUpperCase())}
						</p>
						<p className="dashboard-subtle">
							Start date: {subscription.subscription_start_date ? formatDate(subscription.subscription_start_date) : '—'}
						</p>
						<p className="dashboard-subtle">
							End / Renewal date: {subscription.subscription_end_date ? formatDate(subscription.subscription_end_date) : '—'}
						</p>
						<p className="dashboard-subtle">
							Stripe subscription ID:{' '}
							<span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
								{(subscription.stripe_subscription_id || 'N/A').slice(0, 18)}
								{subscription.stripe_subscription_id?.length > 18 ? '…' : ''}
							</span>
						</p>

						{subscription.is_subscriber && subscription.subscription_status === 'active' ? (
							<div>
								<Button variant="outline" onClick={() => setCancelOpen(true)}>
									Cancel Subscription
								</Button>
							</div>
						) : (
							<div>
								<Button onClick={() => navigate('/subscribe')}>Reactivate Subscription</Button>
							</div>
						)}
					</div>
				</Card>
			) : null}

			{activeTab === 'Charity' ? (
				<Card padding={20}>
					<div style={{ display: 'grid', gap: 16 }}>
						<div>
							<h2 style={{ fontSize: 22, marginBottom: 8 }}>Current Charity</h2>
							{profile?.selected_charity ? (
								<div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
									<p style={{ fontWeight: 700, fontSize: 17 }}>{profile.selected_charity.name}</p>
									<p className="dashboard-subtle">Contribution: {Number(contributionPercent)}%</p>
								</div>
							) : (
								<p className="dashboard-subtle">No charity selected</p>
							)}
						</div>

						<div>
							<h3 style={{ marginBottom: 8 }}>Contribution Percentage</h3>
							<input
								type="range"
								min={10}
								max={100}
								step={1}
								value={contributionPercent}
								onChange={(event) => setContributionPercent(Number(event.target.value))}
								style={{ width: '100%' }}
							/>
							<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
								<input
									type="number"
									min={10}
									max={100}
									value={contributionPercent}
									onChange={(event) => setContributionPercent(Number(event.target.value || 10))}
									style={{
										width: 90,
										background: 'var(--color-surface-2)',
										border: '1px solid var(--color-border)',
										color: 'var(--color-text)',
										borderRadius: 'var(--radius-sm)',
										padding: '7px 9px',
									}}
								/>
								<span className="dashboard-subtle">%</span>
							</div>
							<p className="dashboard-subtle" style={{ marginTop: 8 }}>
								{formatCurrency(monthlyContribution)} per month goes to charity
							</p>
							<div style={{ marginTop: 10 }}>
								<Button
									variant="outline"
									onClick={saveContribution}
									loading={updateProfileMutation.isPending || selectCharityMutation.isPending}
								>
									Save Contribution
								</Button>
							</div>
						</div>

						<div>
							<h3 style={{ marginBottom: 8 }}>Change Charity</h3>
							<input
								type="text"
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
								placeholder="Search charities"
								style={{
									width: '100%',
									background: 'var(--color-surface-2)',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									color: 'var(--color-text)',
									padding: '10px 12px',
								}}
							/>

							<div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
								{charitiesQuery.isLoading ? (
									<Spinner />
								) : charities.length ? (
									charities.map((charity) => {
										const imgSrc = getCharityImage(charity)
										return (
										<button
											key={charity.id}
											type="button"
											onClick={() =>
												selectCharityMutation.mutate({
													charity_id: charity.id,
													charity_contribution_percentage: contributionPercent,
												})
											}
											style={{
												width: '100%',
												textAlign: 'left',
												border: '1px solid var(--color-border)',
												background:
													profile?.selected_charity?.id === charity.id
														? 'rgba(200,245,68,0.1)'
														: 'var(--color-surface-2)',
												borderRadius: 'var(--radius-md)',
												padding: 12,
												color: 'var(--color-text)',
											}}
										>
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
											<p style={{ fontWeight: 700 }}>{charity.name}</p>
											{charity.description ? (
												<p className="dashboard-subtle" style={{ marginTop: 4 }}>
													{charity.description.length > 120
														? `${charity.description.slice(0, 120)}...`
														: charity.description}
												</p>
											) : null}
										</button>
									)})
								) : (
									<p className="dashboard-subtle">No charities found for this search.</p>
								)}
							</div>
						</div>
					</div>
				</Card>
			) : null}

			<Modal
				isOpen={cancelOpen}
				onClose={() => setCancelOpen(false)}
				title="Cancel subscription"
				size="sm"
			>
				<p style={{ color: 'var(--color-text-secondary)', marginBottom: 14 }}>
					Are you sure? Your access continues until{' '}
					{subscription.subscription_end_date ? formatDate(subscription.subscription_end_date) : 'the end of your billing period'}.
				</p>
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
					<Button variant="ghost" onClick={() => setCancelOpen(false)}>
						Keep Subscription
					</Button>
					<Button
						variant="danger"
						loading={cancelSubscriptionMutation.isPending}
						onClick={() => cancelSubscriptionMutation.mutate()}
					>
						Confirm Cancel
					</Button>
				</div>
			</Modal>
		</motion.div>
	)
}

export default SettingsPage
