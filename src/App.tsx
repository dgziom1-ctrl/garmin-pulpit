import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SettingsProvider } from './context/SettingsContext'
import { HealthDataProvider } from './context/HealthDataContext'
import { useHashRoute } from './hooks/useHashRoute'
import { DashboardPage } from './pages/DashboardPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { PredictionsPage } from './pages/PredictionsPage'
import { CoachPage } from './pages/CoachPage'
import { SettingsPage } from './pages/SettingsPage'

function RoutedApp() {
  const { route, navigate } = useHashRoute()

  return (
    <AppShell route={route} navigate={navigate}>
      {route === 'pulpit' ? <DashboardPage navigate={navigate} /> : null}
      {route === 'analityka' ? <AnalyticsPage /> : null}
      {route === 'predykcje' ? <PredictionsPage /> : null}
      {route === 'trener' ? <CoachPage navigate={navigate} /> : null}
      {route === 'ustawienia' ? <SettingsPage /> : null}
    </AppShell>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <HealthDataProvider>
          <RoutedApp />
        </HealthDataProvider>
      </SettingsProvider>
    </ErrorBoundary>
  )
}
