import { ThemeProvider, CssBaseline } from '@mui/material'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { AIProviders } from './pages/AIProviders'
import { Models } from './pages/Models'
import { BotManager } from './pages/BotManager'
import theme from './theme'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="providers" element={<AIProviders />} />
            <Route path="models" element={<Models />} />
            <Route path="bots" element={<BotManager />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
