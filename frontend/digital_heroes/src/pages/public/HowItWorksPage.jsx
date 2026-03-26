import { useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { BarChart2, Check, ChevronDown, Shuffle } from 'lucide-react'
import { Link } from 'react-router-dom'

import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import './public-pages.css'

const faq = [
	{
		q: 'When does the monthly draw happen?',
		a: 'Draws happen at the end of each calendar month. Results are published by the admin and all participants are notified via their dashboard.',
	},
	{
		q: 'Do I need to manually enter the draw?',
		a: "No — as long as you're an active subscriber with at least one score entered, you are automatically entered into every monthly draw.",
	},
	{
		q: 'What happens if I have fewer than 5 scores?',
		a: 'You are still entered with however many scores you have. Your scores on record are your draw numbers — more scores means more potential matches.',
	},
	{
		q: 'How are prizes split between multiple winners?',
		a: 'If multiple subscribers win the same tier (e.g., two people both match 4 numbers), the prize for that tier is split equally between all winners at that level.',
	},
	{
		q: 'How do I know if I\'ve won?',
		a: 'Your dashboard will show your match results after each draw is published. Winners also see a prominent notification in their winnings section with instructions to upload proof.',
	},
]

const StepBlock = ({ number, title, description, points, visual, reverse = false, extra }) => (
	<section className={`how-step ${reverse ? 'reverse' : ''}`}>
		<div>
			<p className="how-step-number">{number}</p>
			<h3 style={{ fontSize: 28, marginTop: -6 }}>{title}</h3>
			<p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>{description}</p>
			<div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
				{points.map((item) => (
					<p key={item} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
						<Check size={14} color="var(--color-accent)" />
						<span>{item}</span>
					</p>
				))}
			</div>
			{extra}
		</div>
		<Card padding={0} className="how-visual-card">
			{visual}
		</Card>
	</section>
)

const HowItWorksPage = () => {
	const [activeFaq, setActiveFaq] = useState(0)

	return (
		<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
			<section className="container" style={{ marginTop: 16 }}>
				<div className="public-hero text-center">
					<span className="public-hero-badge">Simple & Transparent</span>
					<h1 style={{ marginTop: 14, fontSize: 'clamp(34px, 6vw, 56px)', lineHeight: 1.05 }}>
						How Digital Heroes Golf Works
					</h1>
					<p style={{ marginTop: 10, color: 'var(--color-text-secondary)', fontSize: 18 }}>
						Everything you need to know about subscriptions, scores, draws, and giving back.
					</p>
					<div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
						<Link to="/subscribe"><Button>Join Now</Button></Link>
						<Link to="/charities"><Button variant="outline">View Charities</Button></Link>
					</div>
				</div>
			</section>

			<section className="container" style={{ marginTop: 24, display: 'grid', gap: 24 }}>
				<StepBlock
					number="01"
					title="Choose Your Subscription"
					description="Select monthly or yearly. Both plans include full platform access, draw entries, score tracking, and automatic charity contributions. Cancel anytime — no lock-in."
					points={[
						'Monthly or Yearly billing',
						'Secure payments via Stripe',
						'Cancel anytime',
						'Instant access on signup',
					]}
					visual={
						<div style={{ display: 'grid', gap: 8 }}>
							<p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Pricing Preview</p>
							<div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 12 }}>Monthly $9.99</div>
							<div style={{ border: '1px solid rgba(200,245,68,0.42)', borderRadius: 10, padding: 12, background: 'rgba(200,245,68,0.1)' }}>
								Yearly $99.00
							</div>
						</div>
					}
				/>

				<StepBlock
					number="02"
					title="Log Your Stableford Scores"
					description="After each round, enter your Stableford score (1–45). Only your last 5 scores are kept — these become your draw entry numbers for the month."
					reverse
					points={[
						'Stableford format (1–45 per round)',
						'Only 5 scores stored at a time',
						'Newest score replaces oldest automatically',
						'Scores visible in your dashboard',
					]}
					visual={
						<div>
							<p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Score Entry Preview</p>
							<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
								{[34, 29, 38, 31, 41].map((score) => (
									<span key={score} style={{ minWidth: 42, height: 42, borderRadius: '50%', border: '1px solid var(--color-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-2)' }}>
										{score}
									</span>
								))}
							</div>
						</div>
					}
				/>

				<StepBlock
					number="03"
					title="The Monthly Prize Draw"
					description="At the end of each month, 5 numbers are drawn between 1 and 45. Your scores are compared to the drawn numbers. Match 3, 4, or 5 to win a share of the prize pool."
					points={[]}
					extra={
						<div style={{ marginTop: 12, overflowX: 'auto' }}>
							<table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 330 }}>
								<thead>
									<tr>
										<th style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>Match</th>
										<th style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>Prize Share</th>
										<th style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>Rolls Over?</th>
									</tr>
								</thead>
								<tbody>
									<tr><td style={{ paddingTop: 8 }}>5 Numbers</td><td style={{ paddingTop: 8 }}>40% (Jackpot)</td><td style={{ paddingTop: 8 }}>Yes ✓</td></tr>
									<tr><td style={{ paddingTop: 8 }}>4 Numbers</td><td style={{ paddingTop: 8 }}>35%</td><td style={{ paddingTop: 8 }}>No</td></tr>
									<tr><td style={{ paddingTop: 8 }}>3 Numbers</td><td style={{ paddingTop: 8 }}>25%</td><td style={{ paddingTop: 8 }}>No</td></tr>
								</tbody>
							</table>
						</div>
					}
					visual={
						<div>
							<p style={{ marginBottom: 8, color: 'var(--color-text-secondary)', fontSize: 12 }}>Draw Preview</p>
							<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
								{[7, 13, 28, 34, 41].map((num) => (
									<span key={num} style={{ minWidth: 40, height: 40, borderRadius: '50%', background: 'rgba(200,245,68,0.14)', color: 'var(--color-accent)', border: '1px solid rgba(200,245,68,0.45)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{num}</span>
								))}
							</div>
							<p style={{ color: 'var(--color-accent)', fontWeight: 700 }}>You matched 3!</p>
						</div>
					}
				/>

				<StepBlock
					number="04"
					title="Win Prizes & Get Verified"
					description="Winners are notified after each draw. To claim your prize, simply upload a screenshot of your scores from your golf app as proof. Admin reviews and approves within 48 hours."
					reverse
					points={['Draw published', "You're notified", 'Upload score proof', 'Admin verifies', 'Prize paid out']}
					visual={
						<div style={{ border: '1px solid rgba(34,197,94,0.42)', borderRadius: 10, padding: 12, background: 'rgba(34,197,94,0.12)' }}>
							<p style={{ fontWeight: 700, color: '#86efac' }}>🏆 You Won!</p>
							<p style={{ fontSize: 26, color: 'var(--color-accent)', fontWeight: 800 }}>$485.00</p>
						</div>
					}
				/>

				<StepBlock
					number="05"
					title="Your Subscription Gives Back"
					description="A minimum of 10% of every subscription goes directly to your chosen charity. You can increase this percentage any time in your settings. Make every round count for a cause."
					points={[
						'Minimum 10% to charity',
						'You choose the charity',
						'Increase contribution anytime',
						'Independent donations also accepted',
					]}
					visual={
						<div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
							<div style={{ width: 140, height: 140, borderRadius: '50%', background: 'conic-gradient(var(--color-accent) 0 36deg, var(--color-surface-3) 36deg 360deg)' }} />
							<p style={{ color: 'var(--color-text-secondary)' }}>10% charity share</p>
						</div>
					}
				/>
			</section>

			<section className="container" style={{ marginTop: 24 }}>
				<Card padding={18}>
					<div style={{ borderLeft: '4px solid var(--color-accent)', paddingLeft: 10 }}>
						<h3 style={{ fontSize: 24 }}>🎰 How the Jackpot Rollover Works</h3>
						<p style={{ marginTop: 8, color: 'var(--color-text-secondary)' }}>
							If no subscriber matches all 5 drawn numbers in a given month, the jackpot (40% of that month's prize pool) rolls over and is added to the following month's jackpot. This means the jackpot can grow significantly over multiple months with no 5-match winner. The rollover continues until someone wins.
						</p>
					</div>

					<div className="how-rollover-flow" style={{ marginTop: 14 }}>
						<div className="how-flow-box">Month 1: No winner</div>
						<span>→</span>
						<div className="how-flow-box">Month 2: +Rollover</div>
						<span>→</span>
						<div className="how-flow-box" style={{ borderColor: 'rgba(200,245,68,0.42)' }}>Month 3: JACKPOT!</div>
					</div>
				</Card>
			</section>

			<section className="container" style={{ marginTop: 18 }}>
				<div className="public-grid-2">
					<Card padding={16}>
						<div style={{ color: '#38BDF8', marginBottom: 8 }}><Shuffle /></div>
						<h3 style={{ fontSize: 24 }}>Random Draw</h3>
						<p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
							Standard lottery-style. 5 numbers are drawn completely at random from 1–45. Every score has an equal chance of matching.
						</p>
					</Card>

					<Card padding={16}>
						<div style={{ color: '#A78BFA', marginBottom: 8 }}><BarChart2 /></div>
						<h3 style={{ fontSize: 24 }}>Algorithmic Draw</h3>
						<p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
							Numbers are weighted by how frequently they appear across all member scores. More common scores have a higher chance of being drawn — rewarding consistent players.
						</p>
					</Card>
				</div>
				<p style={{ marginTop: 10, color: 'var(--color-text-secondary)' }}>
					The draw type for each month is chosen by the platform admin before the draw runs.
				</p>
			</section>

			<section className="container" style={{ marginTop: 24 }}>
				<h2 style={{ fontSize: 30, marginBottom: 8 }}>FAQ</h2>
				<div style={{ borderTop: '1px solid var(--color-border)' }}>
					{faq.map((item, idx) => {
						const isOpen = activeFaq === idx
						return (
							<div key={item.q} style={{ borderBottom: '1px solid var(--color-border)' }}>
								<button
									type="button"
									onClick={() => setActiveFaq((prev) => (prev === idx ? -1 : idx))}
									style={{
										width: '100%',
										textAlign: 'left',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										background: 'transparent',
										color: 'var(--color-text)',
										border: 'none',
										padding: '14px 0',
										fontWeight: 600,
									}}
								>
									<span>{item.q}</span>
									<motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
										<ChevronDown size={16} />
									</motion.span>
								</button>

								<AnimatePresence>
									{isOpen ? (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: 'auto' }}
											exit={{ opacity: 0, height: 0 }}
											style={{ overflow: 'hidden' }}
										>
											<p style={{ color: 'var(--color-text-secondary)', paddingBottom: 12 }}>{item.a}</p>
										</motion.div>
									) : null}
								</AnimatePresence>
							</div>
						)
					})}
				</div>
			</section>

			<section className="container" style={{ marginTop: 24, marginBottom: 16 }}>
				<Card padding={22}>
					<div className="text-center">
						<h2 style={{ fontSize: 34 }}>Ready to Get Started?</h2>
						<div style={{ marginTop: 12 }}>
							<Link to="/subscribe"><Button>Subscribe</Button></Link>
						</div>
						<p style={{ marginTop: 12, color: 'var(--color-text-secondary)' }}>
							Cancel anytime · 10% to charity · Monthly draws
						</p>
					</div>
				</Card>
			</section>
		</motion.div>
	)
}

export default HowItWorksPage
