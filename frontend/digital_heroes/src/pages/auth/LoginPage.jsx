import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Lock, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { loginUser } from '../../api/authApi'
import { getApiError } from '../../api/axiosClient'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import useAuthStore from '../../store/authStore'

const loginSchema = z.object({
	email: z.email('Please enter a valid email address.'),
	password: z.string().min(6, 'Password must be at least 6 characters.'),
})

const LoginPage = () => {
	const navigate = useNavigate()
	const storeLogin = useAuthStore((state) => state.login)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(loginSchema),
		mode: 'onSubmit',
	})

	const onSubmit = async (values) => {
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
			toast.success('Welcome back!')
			navigate('/dashboard')
		} catch (error) {
			toast.error(getApiError(error))
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

				<form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 22 }}>
					<div style={{ display: 'grid', gap: 14 }}>
						<Input
							label="Email"
							name="email"
							type="email"
							placeholder="you@example.com"
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
