import { useMemo } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ExternalLink, Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { getCharities, getCharityDetail } from '../../api/charityApi'
import { getApiError } from '../../api/axiosClient'
import { selectCharity } from '../../api/userApi'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import useAuthStore from '../../store/authStore'
import { getCharityImage } from '../../utils/charityImages'
import './public-pages.css'

const CharityDetailPage = () => {
	const { slug } = useParams()
	const navigate = useNavigate()
	const queryClient = useQueryClient()

	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
	const user = useAuthStore((state) => state.user)
	const setUser = useAuthStore((state) => state.setUser)

	const detailQuery = useQuery({
		queryKey: ['charity', slug],
		queryFn: async () => (await getCharityDetail(slug)).data,
		enabled: Boolean(slug),
	})

	const allCharitiesQuery = useQuery({
		queryKey: ['charities', 'all-for-detail'],
		queryFn: async () => (await getCharities()).data,
	})

	const selectMutation = useMutation({
		mutationFn: (payload) => selectCharity(payload),
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: ['profile'] })
			if (response?.data?.user) {
				setUser(response.data.user)
			}
			toast.success(`${detailQuery.data?.name} is now your chosen charity! ❤️`)
		},
		onError: (error) => {
			toast.error(getApiError(error))
		},
	})

	const charity = detailQuery.data
	const charityImage = getCharityImage(charity)
	const related = useMemo(() => {
		const all = Array.isArray(allCharitiesQuery.data) ? allCharitiesQuery.data : []
		return all.filter((item) => item.slug !== slug).slice(0, 3)
	}, [allCharitiesQuery.data, slug])

	const isCurrentCharity = user?.selected_charity?.id === charity?.id
	const isSubscriber = Boolean(user?.is_subscriber)

	if (detailQuery.isLoading) {
		return (
			<div className="container" style={{ display: 'grid', gap: 16 }}>
				<Skeleton width="100%" height={400} borderRadius={24} />
				<div className="public-grid-2">
					<Skeleton width="100%" height={300} borderRadius={16} />
					<Skeleton width="100%" height={300} borderRadius={16} />
				</div>
			</div>
		)
	}

	if (detailQuery.isError || !charity) {
		return (
			<div className="container" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
				<Card padding={22}>
					<h2>Charity not found</h2>
					<Link to="/charities" style={{ color: 'var(--color-accent)' }}>← Back to Charities</Link>
				</Card>
			</div>
		)
	}

	return (
		<motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
			<section className="container" style={{ marginTop: 16 }}>
				<div className="charity-detail-banner">
					{charityImage ? (
						<img src={charityImage} alt={charity.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
					<div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.12))' }} />
					<div style={{ position: 'absolute', left: 18, bottom: 16 }}>
						<p style={{ color: 'var(--color-text-secondary)' }}>Charities / {charity.name}</p>
						<h1 style={{ fontSize: 'clamp(30px, 5vw, 52px)', lineHeight: 1.05 }}>{charity.name}</h1>
					</div>
				</div>
			</section>

			<section className="container" style={{ marginTop: 20 }}>
				<div className="public-grid-2" style={{ gridTemplateColumns: '3fr 2fr' }}>
					<div>
						{charity.is_featured ? <span className="public-hero-badge">⭐ Featured Charity</span> : null}
						<h2 style={{ marginTop: 8, fontSize: 'clamp(34px, 4vw, 46px)', lineHeight: 1.05 }}>{charity.name}</h2>

						{charity.website_url ? (
							<a href={charity.website_url} target="_blank" rel="noreferrer" style={{ marginTop: 10, color: 'var(--color-accent)', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
								<span>Visit Website</span>
								<ExternalLink size={14} />
							</a>
						) : null}

						<p style={{ marginTop: 12, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
							{charity.description}
						</p>

						{charity.upcoming_events ? (
							<div style={{ marginTop: 14, borderLeft: '3px solid var(--color-accent)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-2)', padding: 12 }}>
								<p style={{ fontWeight: 700, marginBottom: 4 }}>📅 Upcoming Golf Events</p>
								<p style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{charity.upcoming_events}</p>
							</div>
						) : null}
					</div>

					<div>
						<Card padding={18} className="charity-sticky">
							<div style={{ textAlign: 'center' }}>
								{charityImage ? (
									<img
										src={charityImage}
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

							<h3 style={{ fontSize: 20 }}>Add your contribution</h3>
							<p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
								Select this charity and a portion of your subscription goes directly to {charity.name} every month.
							</p>

							<div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
								{!isAuthenticated ? (
									<>
										<Button fullWidth onClick={() => navigate('/register')}>Create Account</Button>
										<Link to="/login" style={{ color: 'var(--color-accent)', textAlign: 'center' }}>Already a member? Sign in</Link>
									</>
								) : !isSubscriber ? (
									<Button fullWidth onClick={() => navigate('/subscribe')}>Subscribe to Support</Button>
								) : isCurrentCharity ? (
									<Button fullWidth variant="secondary" disabled>
										✓ Your Current Charity
									</Button>
								) : (
									<Button
										fullWidth
										loading={selectMutation.isPending}
										onClick={() => selectMutation.mutate({ charity_id: charity.id })}
									>
										Select This Charity
									</Button>
								)}
							</div>
						</Card>
					</div>
				</div>
			</section>

			<section className="container" style={{ marginTop: 18 }}>
				<div className="public-grid-3">
					<Card padding={16}>
						<p style={{ color: 'var(--color-text-secondary)' }}>48 members</p>
						<p style={{ fontWeight: 800, fontSize: 24 }}>supporting this charity</p>
					</Card>
					<Card padding={16}>
						<p style={{ color: 'var(--color-text-secondary)' }}>$640 donated</p>
						<p style={{ fontWeight: 800, fontSize: 24 }}>this month</p>
					</Card>
					<Card padding={16}>
						<p style={{ color: 'var(--color-text-secondary)' }}>Since 2024</p>
						<p style={{ fontWeight: 800, fontSize: 24 }}>on platform</p>
					</Card>
				</div>
			</section>

			<section className="container" style={{ marginTop: 18, marginBottom: 18 }}>
				<h2 style={{ fontSize: 28, marginBottom: 10 }}>Other Charities You Might Support</h2>
				<div className="public-grid-3">
					{related.map((item) => (
						<Card key={item.id} padding={12} hover>
							<h3 style={{ fontSize: 18 }}>{item.name}</h3>
							<p className="public-multi-line-2" style={{ color: 'var(--color-text-secondary)', marginTop: 6 }}>{item.description}</p>
							<div style={{ marginTop: 10 }}>
								<Link to={`/charities/${item.slug}`}>
									<Button size="sm" variant="outline" fullWidth>Learn More</Button>
								</Link>
							</div>
						</Card>
					))}
				</div>
			</section>
		</motion.div>
	)
}

export default CharityDetailPage
