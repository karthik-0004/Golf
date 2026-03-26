import Footer from './Footer'
import Navbar from './Navbar'

const Layout = ({ children }) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    <Navbar />
    <main
      style={{
        minHeight: '100vh',
        paddingTop: 88,
        paddingBottom: 32,
        flex: 1,
      }}
    >
      {children}
    </main>
    <Footer />
  </div>
)

export default Layout
