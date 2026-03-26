const sizes = {
	sm: 16,
	md: 24,
	lg: 40,
}

const Spinner = ({ size = 'md' }) => {
	const dimension = sizes[size] || sizes.md

	return (
		<span
			aria-label="Loading"
			style={{
				width: dimension,
				height: dimension,
				borderRadius: '50%',
				border: '2px solid rgba(200,245,68,0.2)',
				borderTopColor: 'var(--color-accent)',
				display: 'inline-block',
				animation: 'spin 0.8s linear infinite',
			}}
		/>
	)
}

export default Spinner
