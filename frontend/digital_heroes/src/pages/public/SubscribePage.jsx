import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, Check, ChevronDown, Heart, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { getApiError } from '../../api/axiosClient'
import { createCheckout, getPlans } from '../../api/subscriptionApi'
import Button from '../../components/ui/Button'
import useAuthStore from '../../store/authStore'

const fallbackPlans = [
	{ name: 'monthly', price: 9.99 },
	{ name: 'yearly', price: 99 },
]

const faqItems = [
	{
		question: 'How does the monthly draw work?',
		answer:
			"Each month we draw 5 numbers between 1 and 45. Your last 5 Stableford scores are your entries. Match 3 numbers to win 25% of the prize pool, 4 numbers wins 35%, and matching all 5 wins the jackpot (40%). If no one matches all 5, the jackpot rolls over.",
	},
	{
		question: 'What is Stableford scoring?',
		answer:
			'Stableford is a golf scoring system based on points achieved at each hole. Points range from 0 to 5+ per hole. A typical round score ranges from 20 to 45 points. You enter your total round score.',
	},
	{
		question: 'How is my charity contribution calculated?',
		answer:
			'A minimum of 10% of your subscription fee goes to your chosen charity. You can increase this percentage in your dashboard settings at any time.',
	},
	{
		question: 'Can I cancel my subscription?',
		answer:
			'Yes, you can cancel at any time from your dashboard. Your access continues until the end of your current billing period.',
	},
	{
		question: 'What happens to the jackpot if nobody wins?',
		answer:
			'If no subscriber matches all 5 drawn numbers, the jackpot rolls over and is added to the following month\'s prize pool, growing until someone wins.',
	},
]

const Section = ({ children }) => (
	<motion.section
		initial={{ opacity: 0, y: 24 }}
		whileInView={{ opacity: 1, y: 0 }}
		viewport={{ once: true }}
		transition={{ duration: 0.45, ease: 'easeOut' }}
		style={{ padding: '76px 0' }}
	>
		{children}
	</motion.section>
)

const SubscribePage = () => {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
	const user = useAuthStore((state) => state.user)
	const [activeFaq, setActiveFaq] = useState(null)
	const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState(null)

	const { data, isLoading } = useQuery({
		queryKey: ['subscription-plans'],
		queryFn: async () => {
			const response = await getPlans()
			return response.data
		},
	})

	useEffect(() => {
		const payment = searchParams.get('payment')
		if (payment === 'success') {
			toast.success("🎉 You're in! Welcome to Digital Heroes Golf. Your subscription is active.")
		}
		if (payment === 'cancelled') {
			toast('Payment cancelled. Choose a plan to get started.', { icon: 'ℹ️' })
		}
	}, [searchParams])

	const plans = useMemo(() => {
		const source = Array.isArray(data) && data.length ? data : fallbackPlans
		const monthly = source.find((plan) => plan.name === 'monthly') || fallbackPlans[0]
		const yearly = source.find((plan) => plan.name === 'yearly') || fallbackPlans[1]
		return { monthly, yearly }
	}, [data])

	const savingsText = useMemo(() => {
		const monthlyPrice = Number(plans.monthly?.price || 0)
		const yearlyPrice = Number(plans.yearly?.price || 0)
		if (!monthlyPrice || !yearlyPrice) return 'Save more yearly'
		const yearlyEquivalent = monthlyPrice * 12
		if (!yearlyEquivalent) return 'Save more yearly'
		const savingsPercent = Math.max(0, Math.round(((yearlyEquivalent - yearlyPrice) / yearlyEquivalent) * 100))
		return `Save ${savingsPercent}% vs monthly`
	}, [plans.monthly?.price, plans.yearly?.price])

	const formattedPrice = (value) =>
		new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
			minimumFractionDigits: Number(value) % 1 ? 2 : 0,
			maximumFractionDigits: 2,
		}).format(Number(value || 0))

	const handleCheckout = async (planName) => {
		if (!isAuthenticated) {
			navigate('/register')
			return
		}

		if (user?.is_subscriber) {
			toast('You already have an active subscription!', { icon: '✅' })
			navigate('/dashboard')
			return
		}

		setCheckoutLoadingPlan(planName)
		try {
			const response = await createCheckout({ plan_name: planName })
			const sessionUrl = response?.data?.session_url
			if (!sessionUrl) {
				throw new Error('Missing checkout URL from server.')
			}
			window.location.href = sessionUrl
		} catch (error) {
			toast.error(getApiError(error))
		} finally {
			setCheckoutLoadingPlan(null)
		}
	}

	return (
		<div style={{ background: 'var(--color-primary)', color: 'var(--color-text)', minHeight: '100vh' }}>
			{searchParams.get('payment') === 'success' ? (
				<div
					style={{
						position: 'sticky',
						top: 72,
						zIndex: 20,
						background: 'rgba(34,197,94,0.14)',
						color: 'var(--color-success)',
						borderBottom: '1px solid rgba(34,197,94,0.35)',
						textAlign: 'center',
						padding: '10px 16px',
						fontWeight: 600,
					}}
				>
					🎉 You're in! Welcome to Digital Heroes Golf. Your subscription is active.
				</div>
			) : null}

			<Section>
				<div className="container text-center">
					<span
						style={{
							display: 'inline-flex',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-full)',
							padding: '7px 12px',
							color: 'var(--color-text-secondary)',
							fontSize: 13,
						}}
					>
						🔒 Secure payments via Stripe
					</span>
					<h1 style={{ fontSize: 'clamp(36px, 5vw, 58px)', marginTop: 16, lineHeight: 1.08 }}>
						Choose Your Plan
					</h1>
					<p style={{ marginTop: 10, color: 'var(--color-text-secondary)', fontSize: 18 }}>
						Every subscription funds prizes and supports charity
					</p>
				</div>
			</Section>

			<Section>
				<div className="container" style={{ maxWidth: 860 }}>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
							gap: 24,
						}}
					>
						{isLoading
							? [1, 2].map((item) => (
									<div
										key={item}
										style={{
											height: 420,
											borderRadius: 'var(--radius-lg)',
											border: '1px solid var(--color-border)',
											background:
												'linear-gradient(90deg, var(--color-surface), var(--color-surface-2), var(--color-surface))',
											backgroundSize: '200% 100%',
											animation: 'shimmer 1.3s linear infinite',
										}}
									/>
								))
							: [
									{
										key: 'monthly',
										title: 'Monthly',
										priceText: `${formattedPrice(plans.monthly.price)}/month`,
										features: [
											'Enter up to 5 Stableford scores',
											'Monthly prize draw entry',
											'10% minimum to your chosen charity',
											'Access to all draw results',
											'Cancel anytime',
										],
										variant: 'outline',
									},
									{
										key: 'yearly',
										title: 'Yearly',
										priceText: `${formattedPrice(plans.yearly.price)}/year`,
										features: [
											'Enter up to 5 Stableford scores',
											'Monthly prize draw entry',
											'10% minimum to your chosen charity',
											'Access to all draw results',
											'Cancel anytime',
											'Priority support',
											'Early draw access',
										],
										variant: 'primary',
										popular: true,
									},
								].map((plan) => (
									<motion.article
										key={plan.key}
										whileHover={{ y: -4 }}
										transition={{ duration: 0.2 }}
										style={{
											borderRadius: 'var(--radius-lg)',
											border: `1px solid ${plan.popular ? 'var(--color-accent)' : 'var(--color-border)'}`,
											background: 'var(--color-surface)',
											padding: 24,
											position: 'relative',
										}}
									>
										{plan.popular ? (
											<span
												style={{
													position: 'absolute',
													top: 16,
													right: 16,
													borderRadius: 'var(--radius-full)',
													background: 'rgba(200,245,68,0.18)',
													color: 'var(--color-accent)',
													fontSize: 12,
													fontWeight: 700,
													padding: '5px 10px',
												}}
											>
												Most Popular 🔥
											</span>
										) : null}

										<h3 style={{ fontSize: 24 }}>{plan.title}</h3>
										<p style={{ marginTop: 6, fontSize: 46, lineHeight: 1, color: 'var(--color-accent)', fontWeight: 800 }}>
											{plan.priceText}
										</p>

										{plan.popular ? (
											<span
												style={{
													marginTop: 12,
													display: 'inline-flex',
													borderRadius: 'var(--radius-full)',
													background: 'rgba(245,158,11,0.15)',
													color: 'var(--color-warning)',
													fontSize: 12,
													padding: '5px 9px',
												}}
											>
												{savingsText}
											</span>
										) : null}

										<div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
											{plan.features.map((feature) => (
												<p key={feature} style={{ display: 'flex', gap: 8, color: 'var(--color-text-secondary)', fontSize: 14 }}>
													<Check size={16} color="var(--color-accent)" />
													<span>{feature}</span>
												</p>
											))}
										</div>

										<div style={{ marginTop: 20 }}>
											<Button
												variant={plan.variant}
												fullWidth
												loading={checkoutLoadingPlan === plan.key}
												onClick={() => handleCheckout(plan.key)}
											>
												{plan.key === 'monthly' ? 'Get Started Monthly' : 'Get Started Yearly'}
											</Button>
										</div>
									</motion.article>
								))}
					</div>
				</div>
			</Section>

			<Section>
				<div className="container">
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
							gap: 20,
						}}
					>
						{[
							{
								icon: <Trophy size={24} />,
								title: 'Monthly Prize Draws',
								description:
									'Your scores are automatically entered into the monthly draw. Match 3, 4, or 5 numbers to win.',
							},
							{
								icon: <Heart size={24} />,
								title: 'Charity of Your Choice',
								description:
									'At least 10% of your subscription goes directly to a charity you select. You can increase this at any time.',
							},
							{
								icon: <BarChart3 size={24} />,
								title: 'Score Tracking',
								description:
									'Keep your last 5 Stableford scores on record. Simple entry, automatic rolling — always your latest 5.',
							},
						].map((item) => (
							<motion.article
								key={item.title}
								whileHover={{ y: -4 }}
								style={{
									borderRadius: 'var(--radius-md)',
									border: '1px solid var(--color-border)',
									background: 'var(--color-surface)',
									padding: 22,
								}}
							>
								<div style={{ color: 'var(--color-accent)', marginBottom: 10 }}>{item.icon}</div>
								<h3 style={{ fontSize: 22, marginBottom: 8 }}>{item.title}</h3>
								<p style={{ color: 'var(--color-text-secondary)' }}>{item.description}</p>
							</motion.article>
						))}
					</div>
				</div>
			</Section>

			<Section>
				<div className="container-sm">
					<h2 style={{ fontSize: 36, textAlign: 'center', marginBottom: 16 }}>Frequently Asked Questions</h2>

					<div style={{ borderTop: '1px solid var(--color-border)' }}>
						{faqItems.map((faq, idx) => {
							const isOpen = activeFaq === idx
							return (
								<div key={faq.question} style={{ borderBottom: '1px solid var(--color-border)' }}>
									<button
										type="button"
										onClick={() => setActiveFaq((prev) => (prev === idx ? null : idx))}
										style={{
											width: '100%',
											textAlign: 'left',
											background: 'transparent',
											border: 'none',
											color: 'var(--color-text)',
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											padding: '18px 0',
											fontWeight: 600,
										}}
									>
										<span>{faq.question}</span>
										<motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
											<ChevronDown size={18} />
										</motion.span>
									</button>

									<AnimatePresence>
										{isOpen ? (
											<motion.div
												initial={{ height: 0, opacity: 0 }}
												animate={{ height: 'auto', opacity: 1 }}
												exit={{ height: 0, opacity: 0 }}
												transition={{ duration: 0.25 }}
												style={{ overflow: 'hidden' }}
											>
												<p style={{ color: 'var(--color-text-secondary)', paddingBottom: 16 }}>{faq.answer}</p>
											</motion.div>
										) : null}
									</AnimatePresence>
								</div>
							)
						})}
					</div>
				</div>
			</Section>

			<section style={{ paddingBottom: 70 }}>
				<div className="container text-center" style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
					Secure Payments · Cancel Anytime · 10% to Charity · Monthly Draws
				</div>
			</section>

			<style>
				{`
					@media (max-width: 900px) {
						.container > div[style*='grid-template-columns: repeat(2, minmax(0, 1fr))'],
						.container > div[style*='grid-template-columns: repeat(3, minmax(0, 1fr))'] {
							grid-template-columns: 1fr !important;
						}
					}
				`}
			</style>
		</div>
	)
}

export default SubscribePage
