const variants = {
	success: {
		background: 'rgba(34,197,94,0.15)',
		color: 'var(--color-success)',
	},
	error: {
		background: 'rgba(239,68,68,0.15)',
		color: 'var(--color-error)',
	},
	warning: {
		background: 'rgba(245,158,11,0.15)',
		color: 'var(--color-warning)',
	},
	info: {
		background: 'rgba(56,189,248,0.18)',
		color: '#38BDF8',
	},
	default: {
		background: 'var(--color-surface-3)',
		color: 'var(--color-text-secondary)',
	},
}

const Badge = ({ children, variant = 'default' }) => {
	const style = variants[variant] || variants.default

	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				padding: '4px 10px',
				borderRadius: 'var(--radius-full)',
				fontSize: 12,
				fontWeight: 600,
				...style,
			}}
		>
			{children}
		</span>
	)
}

export default Badge
