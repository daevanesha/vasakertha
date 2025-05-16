import { ThemeProvider, CssBaseline } from '@mui/material'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { AIProviders } from './pages/AIProviders'
import { Models } from './pages/Models'
import { BotManager } from './pages/BotManager'
import { BotModelIntegration } from './pages/BotModelIntegration'
import ConversationHistory from './pages/ConversationHistory'
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
            <Route path="bot-integrations/:botId" element={<BotModelIntegration />} />
            <Route path="conversation-history" element={<ConversationHistory />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
