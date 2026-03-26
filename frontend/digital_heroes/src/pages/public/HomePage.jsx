import { useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  Heart,
  RefreshCw,
  Settings,
  Shield,
  Target,
  Trophy,
  UserPlus,
} from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import { getCharities } from '../../api/charityApi'
import { getPlans } from '../../api/subscriptionApi'
import Button from '../../components/ui/Button'
import './HomePage.css'

const sectionReveal = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: 'easeOut',
    },
  },
}

const itemStagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

const sampleCharities = [
  {
    name: "Children's Golf Foundation",
    slug: 'childrens-golf-foundation',
    description: 'Helping children access life-changing sport and mentoring programs.',
  },
  {
    name: 'Veterans on the Fairway',
    slug: 'veterans-on-the-fairway',
    description: 'Supporting veterans through wellbeing, community, and rehabilitation.',
  },
  {
    name: 'Junior Golf Academy',
    slug: 'junior-golf-academy',
    description: 'Opening pathways for junior players from underserved communities.',
  },
]

const CountUp = ({ value = 0, prefix = '', suffix = '' }) => {
  const [display, setDisplay] = useState(0)
  const triggerRef = useRef(null)
  const inView = useInView(triggerRef, { once: true })

  useEffect(() => {
    if (!inView) return

    const duration = 1100
    const start = performance.now()

    const tick = (time) => {
      const progress = Math.min((time - start) / duration, 1)
      setDisplay(Math.floor(value * progress))
      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }

    requestAnimationFrame(tick)
  }, [inView, value])

  return (
    <span ref={triggerRef}>
      {prefix}
      {display.toLocaleString('en-GB')}
      {suffix}
    </span>
  )
}

const HomePage = () => {
  const {
    data: charitiesData,
    isLoading: charitiesLoading,
    isError: charitiesError,
  } = useQuery({
    queryKey: ['charities-featured'],
    queryFn: async () => {
      const response = await getCharities()
      return response.data
    },
  })

  const { data: plansData } = useQuery({
    queryKey: ['plans-home'],
    queryFn: async () => {
      const response = await getPlans()
      return response.data
    },
  })

  useEffect(() => {
    if (charitiesError) {
      toast.error('Unable to load featured charities right now.')
    }
  }, [charitiesError])

  const featuredCharities = useMemo(() => {
    if (!Array.isArray(charitiesData)) return []
    return charitiesData.filter((item) => item.is_featured).slice(0, 3)
  }, [charitiesData])

  const monthlyPriceLabel = useMemo(() => {
    if (!Array.isArray(plansData)) return '£X'
    const monthly = plansData.find((plan) => plan.name === 'monthly')
    if (!monthly?.price) return '£X'
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(monthly.price))
  }, [plansData])

  return (
    <div className="home-page">
        <section className="home-hero container">
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
          <div className="hero-orb orb-3" />

          <motion.div
            className="home-hero-left"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', staggerChildren: 0.14 }}
          >
            <span className="hero-badge">🏆 Monthly Prize Draws · Charity Impact</span>
            <h1>
              Play Golf.
              <br />
              Win Big.
              <br />
              <span style={{ color: 'var(--color-accent)' }}>Change Lives.</span>
            </h1>
            <p className="hero-subheading">
              Enter your Stableford scores, join the monthly draw, and support the charity
              closest to your heart. Golf meets purpose.
            </p>

            <div className="hero-ctas">
              <Link to="/subscribe">
                <Button variant="primary" size="lg">
                  Start Your Journey
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button variant="outline" size="lg">
                  How It Works
                </Button>
              </Link>
            </div>

            <div className="hero-trust">
              <span>✓ Cancel Anytime</span>
              <span>✓ 10% to Charity</span>
              <span>✓ Monthly Draws</span>
            </div>
          </motion.div>

          <motion.div
            className="home-hero-right"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          >
            <div className="prize-card glass">
              <p className="prize-card-title">This Month's Prize Pool</p>
              <p className="prize-pool-number">£4,280</p>
              <div className="prize-tiers">
                <p>🥇 5-Number Match — Jackpot (40%)</p>
                <p>🥈 4-Number Match — £1,498 (35%)</p>
                <p>🥉 3-Number Match — £1,070 (25%)</p>
              </div>
              <p className="prize-card-footer">Draw closes 31st March 2026</p>
            </div>
            <motion.div
              className="hero-ticker"
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              🟢 247 active members · 12 charities supported
            </motion.div>
          </motion.div>
        </section>

        <motion.section
          className="home-section container"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <div className="section-head text-center">
            <h2>Simple as 1, 2, 3</h2>
            <p>Join thousands making every round count</p>
          </div>

          <motion.div className="steps-grid" variants={itemStagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            {[
              {
                number: '01',
                icon: <UserPlus size={20} />,
                title: 'Subscribe & Join',
                description:
                  'Choose monthly or yearly. Your subscription funds the prize pool and supports your chosen charity automatically.',
              },
              {
                number: '02',
                icon: <Target size={20} />,
                title: 'Enter Your Scores',
                description:
                  'Submit your last 5 Stableford scores after each round. Your scores are your draw entries — the better you play, the more unique numbers you hold.',
              },
              {
                number: '03',
                icon: <Trophy size={20} />,
                title: 'Win & Give Back',
                description:
                  'Monthly draws match your scores against drawn numbers. Win prizes, watch your charity grow, celebrate your community.',
              },
            ].map((step) => (
              <motion.article key={step.number} variants={itemFade} className="step-card">
                <span className="step-number">{step.number}</span>
                <span className="step-icon">{step.icon}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </motion.article>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          className="home-section pool-surface"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <div className="container">
            <div className="section-head text-center">
              <h2>Where Your Subscription Goes</h2>
              <p>Every penny accounted for, every month</p>
            </div>

            <div className="pool-grid">
              <article className="pool-box border-accent">
                <Trophy size={22} color="var(--color-accent)" />
                <p className="pool-box-value text-accent">65%</p>
                <h3>Monthly Prize Pool</h3>
                <p>Split across 3/4/5 number match winners</p>
              </article>

              <article className="pool-box border-success">
                <Heart size={22} color="var(--color-success)" />
                <p className="pool-box-value" style={{ color: 'var(--color-success)' }}>
                  ≥10%
                </p>
                <h3>Goes to Charity</h3>
                <p>You choose which charity receives your contribution</p>
              </article>

              <article className="pool-box">
                <Settings size={22} color="var(--color-text-secondary)" />
                <p className="pool-box-value" style={{ color: 'var(--color-text)' }}>
                  25%
                </p>
                <h3>Platform & Operations</h3>
                <p>Keeping the draws fair, fast, and secure</p>
              </article>
            </div>

            <div className="pool-cta">
              <h3>Ready to make your golf game mean more?</h3>
              <Link to="/subscribe">
                <Button variant="secondary" size="md">
                  Subscribe Now
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="home-section container"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <div className="section-head text-center">
            <h2>Charities You're Supporting</h2>
            <p>Real causes. Real impact. Your choice.</p>
          </div>

          <div className="charity-grid">
            {charitiesLoading
              ? [1, 2, 3].map((idx) => (
                  <article key={idx} className="charity-card">
                    <div className="charity-image skeleton" />
                    <div className="skeleton" style={{ height: 18, borderRadius: 8, width: '64%', marginBottom: 10 }} />
                    <div className="skeleton" style={{ height: 14, borderRadius: 8, width: '100%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 14, borderRadius: 8, width: '84%' }} />
                  </article>
                ))
              : (featuredCharities.length ? featuredCharities : sampleCharities).map((charity) => (
                  <article key={charity.slug} className="charity-card">
                    <div className="charity-image">
                      {charity.logo ? (
                        <img src={charity.logo} alt={charity.name} />
                      ) : (
                        <div className="flex-center" style={{ height: '100%', color: 'var(--color-text-muted)' }}>
                          <Heart size={24} />
                        </div>
                      )}
                    </div>
                    <h3>{charity.name}</h3>
                    <p className="charity-description">{charity.description}</p>
                    <Link className="charity-link" to={`/charities/${charity.slug}`}>
                      Learn More →
                    </Link>
                  </article>
                ))}
          </div>

          <div className="text-center">
            <Link className="charity-all-link" to="/charities">
              View All Charities →
            </Link>
          </div>
        </motion.section>

        <motion.section
          className="home-section stats-surface"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <div className="container">
            <div className="stats-grid">
              {[
                { value: 247, suffix: '+', label: 'Active Members' },
                { value: 18400, prefix: '£', suffix: '+', label: 'Prizes Awarded' },
                { value: 12, label: 'Charities Supported' },
                { value: 2100, prefix: '£', suffix: '+', label: 'Donated to Charity' },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <p className="stat-value">
                    <CountUp value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  </p>
                  <p className="stat-label">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="home-section final-cta"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <div className="container">
            <div className="final-cta-box">
              <h2>Your Next Round Could Change Everything</h2>
              <p>
                Join the community where every Stableford score is a chance to win, and every
                subscription supports a cause.
              </p>

              <div style={{ marginTop: 22 }}>
                <Link to="/subscribe">
                  <Button size="lg" variant="primary">
                    Join Digital Heroes Golf
                  </Button>
                </Link>
              </div>

              <p className="final-meta">
                From {monthlyPriceLabel}/month · Cancel anytime · 10% to charity
              </p>

              <div className="trust-icons">
                <span>
                  <Shield size={16} /> Secure
                </span>
                <span>
                  <RefreshCw size={16} /> Cancel Anytime
                </span>
                <span>
                  <Heart size={16} /> Charity First
                </span>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
  )
}

export default HomePage
