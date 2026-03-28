import { useState } from 'react'

import { Eye, EyeOff } from 'lucide-react'

const Input = ({
	label,
	name,
	type = 'text',
	placeholder,
	error,
	register,
	icon,
	helperText,
	disabled = false,
}) => {
	const registration = register && name ? register(name) : {}
	const isPasswordType = type === 'password'
	const [showPassword, setShowPassword] = useState(false)

	const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type

	return (
		<div style={{ width: '100%' }}>
			{label && (
				<label
					htmlFor={name}
					style={{
						display: 'block',
						marginBottom: 8,
						color: 'var(--color-text-secondary)',
						fontSize: 14,
						fontWeight: 500,
					}}
				>
					{label}
				</label>
			)}

			<div style={{ position: 'relative' }}>
				{icon && (
					<span
						style={{
							position: 'absolute',
							top: '50%',
							left: 12,
							transform: 'translateY(-50%)',
							display: 'inline-flex',
							color: 'var(--color-text-secondary)',
							pointerEvents: 'none',
						}}
					>
						{icon}
					</span>
				)}
				<input
					id={name}
					name={name}
					type={inputType}
					placeholder={placeholder}
					disabled={disabled}
					{...registration}
					style={{
						width: '100%',
						background: 'var(--color-surface-2)',
						border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
						borderRadius: 'var(--radius-md)',
						color: 'var(--color-text)',
						padding: icon
							? isPasswordType
								? '11px 42px 11px 40px'
								: '11px 12px 11px 40px'
							: isPasswordType
								? '11px 42px 11px 12px'
								: '11px 12px',
						outline: 'none',
						transition: 'var(--transition)',
						fontSize: 14,
					}}
					onFocus={(event) => {
						event.currentTarget.style.borderColor = error
							? 'var(--color-error)'
							: 'var(--color-accent)'
					}}
					onBlur={(event) => {
						event.currentTarget.style.borderColor = error
							? 'var(--color-error)'
							: 'var(--color-border)'
					}}
				/>
				{isPasswordType && (
					<button
						type="button"
						onClick={() => setShowPassword((prev) => !prev)}
						aria-label={showPassword ? 'Hide password' : 'Show password'}
						style={{
							position: 'absolute',
							top: '50%',
							right: 12,
							transform: 'translateY(-50%)',
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							background: 'none',
							border: 'none',
							color: 'var(--color-text-secondary)',
							cursor: 'pointer',
							padding: 2,
							borderRadius: 'var(--radius-sm)',
							transition: 'var(--transition)',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.color = 'var(--color-accent)'
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.color = 'var(--color-text-secondary)'
						}}
					>
						{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
					</button>
				)}
			</div>

			{error ? (
				<p style={{ marginTop: 6, color: 'var(--color-error)', fontSize: 12 }}>{error}</p>
			) : helperText ? (
				<p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 12 }}>
					{helperText}
				</p>
			) : null}
		</div>
	)
}

export default Input
