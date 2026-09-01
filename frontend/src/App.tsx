export default function App() {
  return (
    <main style={{
      fontFamily: 'system-ui, sans-serif',
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#f8fafc',
      color: '#0f172a',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem 3rem',
        borderRadius: '18px',
        background: '#ffffff',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
      }}>
        <h1>OrderFlow</h1>
        <p>Frontend is running successfully.</p>
      </div>
    </main>
  );
}
