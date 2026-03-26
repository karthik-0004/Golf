const Card = ({ children, className = '', hover = false, padding = 24, onClick }) => (
	<div
		className={className}
		onClick={onClick}
		style={{
			background: 'var(--color-surface)',
			border: '1px solid var(--color-border)',
			borderRadius: 'var(--radius-md)',
			padding,
			transition: 'var(--transition)',
			cursor: onClick ? 'pointer' : 'default',
			boxShadow: 'var(--shadow-sm)',
		}}
		onMouseEnter={(event) => {
			if (!hover) return
			event.currentTarget.style.transform = 'translateY(-2px)'
			event.currentTarget.style.borderColor = 'var(--color-accent)'
			event.currentTarget.style.boxShadow = 'var(--shadow-md)'
		}}
		onMouseLeave={(event) => {
			if (!hover) return
			event.currentTarget.style.transform = 'translateY(0)'
			event.currentTarget.style.borderColor = 'var(--color-border)'
			event.currentTarget.style.boxShadow = 'var(--shadow-sm)'
		}}
	>
		{children}
	</div>
)

export default Card
