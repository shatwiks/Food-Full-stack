import ThemeProvider from './components/ThemeProvider';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <ThemeProvider>
      <HomePage />
    </ThemeProvider>
  );
}
