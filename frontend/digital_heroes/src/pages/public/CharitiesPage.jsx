import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ExternalLink, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getCharities } from '../../api/charityApi'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import useAuthStore from '../../store/authStore'
import { getCharityImage } from '../../utils/charityImages'
import './public-pages.css'

const filterOptions = ['All', 'Featured', 'Golf Events', 'Youth', 'Veterans']

const CharitiesPage = () => {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
	const [searchInput, setSearchInput] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [activeFilter, setActiveFilter] = useState('All')

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
		return () => clearTimeout(timer)
	}, [searchInput])

	const charitiesQuery = useQuery({
		queryKey: ['charities', debouncedSearch],
		queryFn: async () => (await getCharities(debouncedSearch)).data,
	})

	const charities = Array.isArray(charitiesQuery.data) ? charitiesQuery.data : []

	const filtered = useMemo(() => {
		if (activeFilter === 'All') return charities
		if (activeFilter === 'Featured') return charities.filter((charity) => charity.is_featured)

		const keywordMap = {
			'Golf Events': ['golf', 'event'],
			Youth: ['youth', 'junior', 'children', 'kids'],
			Veterans: ['veteran', 'service', 'armed'],
		}

		const keywords = keywordMap[activeFilter] || []
		return charities.filter((charity) => {
			const hay = `${charity.name || ''} ${charity.description || ''}`.toLowerCase()
			return keywords.some((key) => hay.includes(key))
		})
	}, [activeFilter, charities])

	const featured = filtered.find((charity) => charity.is_featured) || charities.find((charity) => charity.is_featured)
	const featuredImage = getCharityImage(featured)

	return (
		<motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
			<section className="container" style={{ marginTop: 16 }}>
				<div className="public-hero text-center">
					<span className="public-hero-badge">🤝 Making a Difference</span>
					<h1 style={{ marginTop: 14, fontSize: 'clamp(34px, 6vw, 54px)', lineHeight: 1.05 }}>Charities We Support</h1>
					<p style={{ marginTop: 8, color: 'var(--color-text-secondary)', fontSize: 18 }}>
						Every subscription contributes to causes that matter. Choose the charity closest to your heart.
					</p>

					<div className="public-stats-row">
						<span className="public-stat-chip">12 Charities</span>
						<span className="public-stat-chip">$2,100+ Donated</span>
						<span className="public-stat-chip">247 Members Contributing</span>
					</div>
				</div>
			</section>

			<section className="container" style={{ marginTop: 20 }}>
				<div style={{ display: 'grid', gap: 10 }}>
					<div style={{ position: 'relative', width: 'min(100%, 400px)' }}>
						<Search size={16} style={{ position: 'absolute', top: 13, left: 10, color: 'var(--color-text-secondary)' }} />
						<input
							type="text"
							value={searchInput}
							onChange={(event) => setSearchInput(event.target.value)}
							placeholder="Search charities..."
							style={{
								width: '100%',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								background: 'var(--color-surface-2)',
								color: 'var(--color-text)',
								padding: '10px 12px 10px 34px',
							}}
						/>
					</div>

					<div className="public-filter-row">
						{filterOptions.map((item) => (
							<button
								key={item}
								type="button"
								onClick={() => setActiveFilter(item)}
								className={`public-filter-pill ${activeFilter === item ? 'active' : ''}`}
							>
								{item}
							</button>
						))}
					</div>
				</div>
			</section>

			{featured ? (
				<section className="container" style={{ marginTop: 24 }}>
					<h2 style={{ fontSize: 28, marginBottom: 10 }}>⭐ Featured This Month</h2>
					<Card padding={0}>
						<div className="public-grid-2">
							<div
								style={{
									minHeight: 280,
									background: 'linear-gradient(145deg, var(--color-surface-2), #202736)',
									display: 'grid',
									placeItems: 'center',
									overflow: 'hidden',
								}}
							>
								{featuredImage ? (
									<img src={featuredImage} alt={featured.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
								) : (
									<span className="public-charity-placeholder">{(featured.name || 'C')[0]}</span>
								)}
							</div>

							<div style={{ padding: 20 }}>
								<span className="public-hero-badge">Featured</span>
								<h3 style={{ marginTop: 8, fontSize: 'clamp(30px, 4vw, 36px)', lineHeight: 1.1 }}>{featured.name}</h3>
								<p style={{ marginTop: 10, color: 'var(--color-text-secondary)' }}>{featured.description}</p>

								{featured.website_url ? (
									<a
										href={featured.website_url}
										target="_blank"
										rel="noreferrer"
										style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-accent)' }}
									>
										<span>Visit Website →</span>
										<ExternalLink size={14} />
									</a>
								) : null}

								{featured.upcoming_events ? (
									<div style={{ marginTop: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', padding: 10 }}>
										<p style={{ fontWeight: 700, marginBottom: 4 }}>Upcoming Events:</p>
										<p className="public-multi-line-2" style={{ color: 'var(--color-text-secondary)' }}>{featured.upcoming_events}</p>
									</div>
								) : null}

								<div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
									<Link to={isAuthenticated ? '/dashboard/settings#charity' : '/register'}>
										<Button>Support This Charity</Button>
									</Link>
									<Link to={`/charities/${featured.slug}`}>
										<Button variant="outline">Learn More</Button>
									</Link>
								</div>
							</div>
						</div>
					</Card>
				</section>
			) : null}

			<section className="container" style={{ marginTop: 24 }}>
				<h2 style={{ fontSize: 28, marginBottom: 10 }}>All Charities</h2>

				{charitiesQuery.isLoading ? (
					<div className="public-grid-3">
						{Array.from({ length: 6 }).map((_, idx) => (
							<Card key={idx} padding={0}>
								<Skeleton width="100%" height={160} borderRadius={0} />
								<div style={{ padding: 12 }}>
									<Skeleton width="60%" height={20} count={1} />
									<div style={{ marginTop: 8 }}>
										<Skeleton width="100%" height={14} count={3} />
									</div>
								</div>
							</Card>
						))}
					</div>
				) : filtered.length ? (
					<div className="public-grid-3">
						{filtered.map((charity) => {
							const charityImage = getCharityImage(charity)
							return (
							<Card key={charity.id} padding={0} hover>
								<div style={{ width: '100%', height: '160px' }}>
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

								<div style={{ padding: 12, display: 'grid', gap: 8 }}>
									{charity.is_featured ? <span className="public-hero-badge">⭐ Featured</span> : null}
									<h3 style={{ fontSize: 20 }}>{charity.name}</h3>
									<p className="public-multi-line-3" style={{ color: 'var(--color-text-secondary)' }}>{charity.description}</p>
									{charity.website_url ? (
										<p className="public-multi-line-2" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{charity.website_url}</p>
									) : null}
									{charity.upcoming_events ? (
										<p className="public-multi-line-2" style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
											📅 {charity.upcoming_events}
										</p>
									) : null}

									<Link to={`/charities/${charity.slug}`}>
										<Button variant="outline" size="sm" fullWidth>
											Learn More →
										</Button>
									</Link>
								</div>
							</Card>
							)
						})}
					</div>
				) : (
					<Card padding={18}>
						<p style={{ color: 'var(--color-text-secondary)' }}>
							No charities found matching '{debouncedSearch}'
						</p>
						<div style={{ marginTop: 10 }}>
							<Button variant="ghost" onClick={() => setSearchInput('')}>Clear Search</Button>
						</div>
					</Card>
				)}
			</section>

			<section className="container" style={{ marginTop: 24, marginBottom: 16 }}>
				<div className="public-cta-banner">
					<div>
						<p style={{ fontWeight: 800, fontSize: 24 }}>Want to suggest a charity?</p>
						<p style={{ opacity: 0.8 }}>We're always looking to add meaningful causes to our platform.</p>
					</div>
					<a href="mailto:hello@digitalheroes.co.in">
						<Button variant="secondary">Get in Touch</Button>
					</a>
				</div>
			</section>
		</motion.div>
	)
}

export default CharitiesPage
