export const modernStyles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundImage: 'url("https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2053&auto=format&fit=crop")',
    position: 'relative',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(16px)',
    borderRadius: '24px',
    padding: '3rem 2.5rem',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    zIndex: 10,
    border: '1px solid rgba(255, 255, 255, 0.4)'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    margin: '0 0 1rem 0',
    color: '#2d3748',
    textShadow: '0 1px 2px rgba(255,255,255,0.8)'
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#4a5568',
    margin: '0 0 2rem 0'
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  input: {
    padding: '0.875rem 1rem',
    borderRadius: '12px',
    border: '2px solid rgba(226, 232, 240, 0.8)',
    background: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1rem',
    color: '#1a202c',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  buttonPrimary: {
    width: '100%',
    padding: '1rem',
    fontSize: '1.125rem',
    fontWeight: '700',
    border: 'none',
    borderRadius: '9999px',
    background: 'linear-gradient(135deg, #f97316, #f43f5e)', // orange to red/pink
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  link: {
    color: '#f97316',
    fontWeight: '600',
    textDecoration: 'none',
  }
};
