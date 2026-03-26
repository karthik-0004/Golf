import { Link } from 'react-router-dom'

const columnTitleStyle = {
  color: 'var(--color-text)',
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 10,
}

const itemStyle = {
  color: 'var(--color-text-secondary)',
  fontSize: 14,
  marginBottom: 8,
  display: 'inline-block',
}

const Footer = () => (
  <footer
    style={{
      background: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      marginTop: 'auto',
    }}
  >
    <div className="container" style={{ paddingTop: 36, paddingBottom: 28 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 24,
        }}
      >
        <div>
          <h3 style={{ ...columnTitleStyle, fontSize: 18 }}>
            ⛳ Digital <span style={{ color: 'var(--color-accent)' }}>Heroes</span>
          </h3>
          <p style={{ ...itemStyle, marginBottom: 0 }}>Golf. Charity. Community.</p>
          <p style={{ ...itemStyle, marginTop: 10 }}>
            A premium charity subscription platform where every entry fuels impact.
          </p>
        </div>

        <div>
          <h4 style={columnTitleStyle}>Platform</h4>
          <Link to="/how-it-works" style={itemStyle}>How It Works</Link>
          <br />
          <Link to="/charities" style={itemStyle}>Charities</Link>
          <br />
          <Link to="/subscribe" style={itemStyle}>Subscribe</Link>
          <br />
          <Link to="/draws/history" style={itemStyle}>Draw Results</Link>
        </div>

        <div>
          <h4 style={columnTitleStyle}>Account</h4>
          <Link to="/login" style={itemStyle}>Login</Link>
          <br />
          <Link to="/register" style={itemStyle}>Register</Link>
          <br />
          <Link to="/dashboard" style={itemStyle}>Dashboard</Link>
          <br />
          <Link to="/dashboard/settings" style={itemStyle}>Settings</Link>
        </div>

        <div>
          <h4 style={columnTitleStyle}>Legal</h4>
          <Link to="/privacy" style={itemStyle}>Privacy Policy</Link>
          <br />
          <Link to="/terms" style={itemStyle}>Terms of Service</Link>
          <p style={{ ...itemStyle, marginTop: 12 }}>© 2026 Digital Heroes. All rights reserved.</p>
        </div>
      </div>

      <div
        style={{
          marginTop: 26,
          paddingTop: 16,
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          fontSize: 13,
        }}
      >
        Powered by Digital Heroes · digitalheroes.co.in
      </div>
    </div>

    <style>
      {`
        @media (max-width: 900px) {
          footer .container > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}
    </style>
  </footer>
)

export default Footer
