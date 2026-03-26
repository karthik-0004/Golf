import { useMemo, useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { AtSign, Lock, Mail, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { registerUser } from '../../api/authApi'
import { getApiError } from '../../api/axiosClient'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import useAuthStore from '../../store/authStore'

const registerSchema = z
	.object({
		first_name: z.string().min(1, 'First name is required.'),
		last_name: z.string().min(1, 'Last name is required.'),
		email: z.email('Please enter a valid email address.'),
		username: z
			.string()
			.min(3, 'Username must be at least 3 characters.')
			.regex(/^[A-Za-z0-9_]+$/, 'Use only letters, numbers, and underscores.'),
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters.')
			.regex(/\d/, 'Password must contain at least one number.'),
		confirm_password: z.string().min(1, 'Please confirm your password.'),
		accepted_terms: z.boolean().refine((value) => value === true, {
			message: 'You must agree to the Terms and Privacy Policy.',
		}),
	})
	.refine((data) => data.password === data.confirm_password, {
		message: 'Passwords do not match.',
		path: ['confirm_password'],
	})

const getPasswordStrength = (password) => {
	if (!password) return { label: 'Weak', width: '10%', color: 'var(--color-error)' }

	let score = 0
	if (password.length >= 8) score += 1
	if (/\d/.test(password)) score += 1
	if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1

	if (score <= 1) return { label: 'Weak', width: '33%', color: 'var(--color-error)' }
	if (score === 2) return { label: 'Good', width: '66%', color: 'var(--color-warning)' }
	return { label: 'Strong', width: '100%', color: 'var(--color-success)' }
}

const RegisterPage = () => {
	const navigate = useNavigate()
	const storeLogin = useAuthStore((state) => state.login)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(registerSchema),
		mode: 'onSubmit',
		defaultValues: {
			accepted_terms: false,
		},
	})

	const passwordValue = watch('password')
	const strength = useMemo(() => getPasswordStrength(passwordValue), [passwordValue])

	const onSubmit = async (values) => {
		setIsSubmitting(true)
		try {
			const payload = {
				first_name: values.first_name,
				last_name: values.last_name,
				email: values.email,
				username: values.username,
				password: values.password,
				confirm_password: values.confirm_password,
			}
			const response = await registerUser(payload)

			const user = response?.data?.user
			const access = response?.data?.access || response?.data?.tokens?.access
			const refresh = response?.data?.refresh || response?.data?.tokens?.refresh

			if (!user || !access || !refresh) {
				throw new Error('Invalid register response from server.')
			}

			storeLogin(user, access, refresh)
			toast.success('Account created! Welcome to Digital Heroes Golf 🎉')
			navigate('/subscribe')
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
					width: 500,
					height: 500,
					borderRadius: '50%',
					background: 'radial-gradient(circle, rgba(200,245,68,0.08) 0%, transparent 70%)',
					top: -100,
					left: -130,
					animation: 'drift 13s ease-in-out infinite',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					width: 380,
					height: 380,
					borderRadius: '50%',
					background: 'radial-gradient(circle, rgba(26,26,46,0.65) 0%, transparent 70%)',
					bottom: -100,
					right: -90,
					animation: 'drift 12s ease-in-out infinite reverse',
				}}
			/>

			<motion.div
				initial={{ opacity: 0, y: 18 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.45, ease: 'easeOut' }}
				style={{
					width: '100%',
					maxWidth: 520,
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
						marginBottom: 20,
					}}
				>
					<span>⛳</span>
					<span style={{ fontWeight: 700 }}>
						Digital <span style={{ color: 'var(--color-accent)' }}>Heroes</span>
					</span>
				</Link>

				<h1 style={{ fontSize: 34, lineHeight: 1.1 }}>Create Your Account</h1>
				<p style={{ marginTop: 8, color: 'var(--color-text-secondary)' }}>
					Join the community. Play. Win. Give.
				</p>

				<form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 22 }}>
					<div style={{ display: 'grid', gap: 12 }}>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
							<Input
								label="First Name"
								name="first_name"
								placeholder="First name"
								icon={<User size={16} />}
								register={register}
								error={errors.first_name?.message}
							/>
							<Input
								label="Last Name"
								name="last_name"
								placeholder="Last name"
								icon={<User size={16} />}
								register={register}
								error={errors.last_name?.message}
							/>
						</div>

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
							label="Username"
							name="username"
							placeholder="your_username"
							icon={<AtSign size={16} />}
							register={register}
							error={errors.username?.message}
						/>

						<Input
							label="Password"
							name="password"
							type="password"
							placeholder="Create password"
							icon={<Lock size={16} />}
							register={register}
							error={errors.password?.message}
						/>

						<div>
							<div
								style={{
									height: 6,
									borderRadius: 'var(--radius-full)',
									background: 'var(--color-surface-3)',
									overflow: 'hidden',
								}}
							>
								<div
									style={{
										width: strength.width,
										height: '100%',
										borderRadius: 'var(--radius-full)',
										background: strength.color,
										transition: 'var(--transition)',
									}}
								/>
							</div>
							<p style={{ marginTop: 6, fontSize: 12, color: strength.color }}>{strength.label}</p>
						</div>

						<Input
							label="Confirm Password"
							name="confirm_password"
							type="password"
							placeholder="Confirm password"
							icon={<Lock size={16} />}
							register={register}
							error={errors.confirm_password?.message}
						/>
					</div>

					<label
						style={{
							marginTop: 14,
							display: 'flex',
							alignItems: 'flex-start',
							gap: 10,
							color: 'var(--color-text-secondary)',
							fontSize: 13,
						}}
					>
						<input
							type="checkbox"
							{...register('accepted_terms')}
							style={{
								marginTop: 2,
								width: 16,
								height: 16,
								accentColor: 'var(--color-accent)',
							}}
						/>
						<span>I agree to the Terms of Service and Privacy Policy</span>
					</label>
					{errors.accepted_terms?.message ? (
						<p style={{ marginTop: 6, color: 'var(--color-error)', fontSize: 12 }}>
							{errors.accepted_terms.message}
						</p>
					) : null}

					<div style={{ marginTop: 16 }}>
						<Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
							Create Account
						</Button>
					</div>
				</form>

				<div
					style={{
						marginTop: 22,
						paddingTop: 14,
						borderTop: '1px solid var(--color-border)',
						color: 'var(--color-text-secondary)',
						fontSize: 14,
						textAlign: 'center',
					}}
				>
					Already have an account?{' '}
					<Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
						Sign in
					</Link>
				</div>
			</motion.div>

			<style>
				{`
					@keyframes drift {0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(12px,-16px,0)}}
					@media (max-width: 640px) {
						form div[style*='grid-template-columns: repeat(2, minmax(0, 1fr))'] {
							grid-template-columns: 1fr !important;
						}
					}
				`}
			</style>
		</div>
	)
}

export default RegisterPage
