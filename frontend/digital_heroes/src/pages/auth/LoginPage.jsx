import { useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Lock, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { loginUser } from '../../api/authApi'
import { getApiError } from '../../api/axiosClient'
import { getCurrentDraw, getMyEntries, getMyWinnings } from '../../api/drawApi'
import { getScores } from '../../api/scoresApi'
import { getSubscriptionStatus } from '../../api/subscriptionApi'
import { getProfile } from '../../api/userApi'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import useAuthStore from '../../store/authStore'

const loginSchema = z.object({
	email: z.string().min(1, 'Email or username is required.'),
	password: z.string().min(6, 'Password must be at least 6 characters.'),
})

const LoginPage = () => {
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const storeLogin = useAuthStore((state) => state.login)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [loginError, setLoginError] = useState('')

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(loginSchema),
		mode: 'onSubmit',
	})

	const onSubmit = async (values) => {
		setLoginError('')
		setIsSubmitting(true)
		try {
			const response = await loginUser(values)
			const user = response?.data?.user
			const access = response?.data?.access || response?.data?.tokens?.access
			const refresh = response?.data?.refresh || response?.data?.tokens?.refresh

			if (!user || !access || !refresh) {
				throw new Error('Invalid login response from server.')
			}

			storeLogin(user, access, refresh)

			// Prefetch all dashboard data NOW so it's cached before navigation
			if (!user?.is_staff) {
				queryClient.prefetchQuery({ queryKey: ['profile'], queryFn: async () => (await getProfile()).data })
				queryClient.prefetchQuery({ queryKey: ['subscription-status'], queryFn: async () => (await getSubscriptionStatus()).data })
				queryClient.prefetchQuery({ queryKey: ['my-scores'], queryFn: async () => (await getScores()).data })
				queryClient.prefetchQuery({ queryKey: ['current-draw'], queryFn: async () => { try { return (await getCurrentDraw()).data } catch { return null } } })
				queryClient.prefetchQuery({ queryKey: ['my-winnings'], queryFn: async () => (await getMyWinnings()).data })
				queryClient.prefetchQuery({ queryKey: ['my-entries'], queryFn: async () => (await getMyEntries()).data })
			}

			toast.success('Welcome back!')
			navigate(user?.is_staff ? '/admin/dashboard' : '/dashboard')
		} catch (error) {
			const status = error?.response?.status
			const errorMessage = getApiError(error)

			if (status === 401 || status === 400) {
				setLoginError('Incorrect email/username or password. Please check your credentials and try again.')
			} else {
				setLoginError(errorMessage || 'Something went wrong. Please try again.')
			}
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div
			style={{
				minHeight: '100vh',
				background: 'var(--color-primary)',
				position: 'relative',
				overflow: 'hidden',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 24,
			}}
		>
			<div
				style={{
					position: 'absolute',
					width: 420,
					height: 420,
					borderRadius: '50%',
					background: 'radial-gradient(circle, rgba(200,245,68,0.09) 0%, transparent 70%)',
					top: -90,
					left: -120,
					animation: 'drift 12s ease-in-out infinite',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					width: 360,
					height: 360,
					borderRadius: '50%',
					background: 'radial-gradient(circle, rgba(26,26,46,0.65) 0%, transparent 70%)',
					bottom: -110,
					right: -90,
					animation: 'drift 14s ease-in-out infinite reverse',
				}}
			/>

			<motion.div
				initial={{ opacity: 0, y: 18 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.45, ease: 'easeOut' }}
				style={{
					width: '100%',
					maxWidth: 440,
					background: 'var(--color-surface)',
					border: '1px solid var(--color-border)',
					borderRadius: 'var(--radius-lg)',
					padding: 40,
					boxShadow: 'var(--shadow-lg)',
					position: 'relative',
					zIndex: 1,
				}}
			>
				<Link
					to="/"
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 8,
						marginBottom: 22,
					}}
				>
					<span>⛳</span>
					<span style={{ fontWeight: 700 }}>
						Digital <span style={{ color: 'var(--color-accent)' }}>Heroes</span>
					</span>
				</Link>

				<h1 style={{ fontSize: 34, lineHeight: 1.1 }}>Welcome Back</h1>
				<p style={{ marginTop: 8, color: 'var(--color-text-secondary)' }}>Sign in to your account</p>

				{loginError && (
					<motion.div
						initial={{ opacity: 0, y: -8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.25 }}
						style={{
							marginTop: 16,
							padding: '12px 14px',
							background: 'rgba(239, 68, 68, 0.1)',
							border: '1px solid rgba(239, 68, 68, 0.3)',
							borderRadius: 'var(--radius-md)',
							display: 'flex',
							alignItems: 'center',
							gap: 10,
						}}
					>
						<span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
						<p style={{ color: 'var(--color-error)', fontSize: 13, lineHeight: 1.4 }}>
							{loginError}
						</p>
					</motion.div>
				)}

				<form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 22 }}>
					<div style={{ display: 'grid', gap: 14 }}>
						<Input
							label="Email or Username"
							name="email"
							type="text"
							placeholder="you@example.com or admin"
							icon={<Mail size={16} />}
							register={register}
							error={errors.email?.message}
						/>

						<Input
							label="Password"
							name="password"
							type="password"
							placeholder="Enter your password"
							icon={<Lock size={16} />}
							register={register}
							error={errors.password?.message}
						/>
					</div>

					<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
						<Link to="#" style={{ fontSize: 13, color: 'var(--color-accent)' }}>
							Forgot password?
						</Link>
					</div>

					<div style={{ marginTop: 16 }}>
						<Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
							Sign In
						</Button>
					</div>
				</form>

				<div
					style={{
						marginTop: 24,
						paddingTop: 16,
						borderTop: '1px solid var(--color-border)',
						color: 'var(--color-text-secondary)',
						fontSize: 14,
						textAlign: 'center',
					}}
				>
					Don't have an account?{' '}
					<Link to="/register" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
						Register here
					</Link>
				</div>
			</motion.div>

			<style>
				{`@keyframes drift {0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(10px,-14px,0)}}`}
			</style>
		</div>
	)
}

export default LoginPage
