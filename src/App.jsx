import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import AuthPanel from './components/AuthPanel'
import DateNavigator from './components/DateNavigator'
import ServicePane from './components/ServicePane'
import {
  checkAllowlist,
  configureAuthPersistence,
  signInWithGoogle,
  signOutUser,
  subscribeToAuthChanges,
} from './lib/auth'
import { fetchServiceDay } from './lib/api'
import { getTodayDate } from './lib/date'
import { hasFirebaseConfig } from './lib/firebase'
import { setItemDoneState, subscribeToDateStatus } from './lib/statusStore'

const PIN_STORAGE_KEY = 'service_tracker_api_pin'

function App() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [forceRefresh, setForceRefresh] = useState(false)
  const [pin, setPin] = useState(() => sessionStorage.getItem(PIN_STORAGE_KEY) ?? '')
  const [user, setUser] = useState(null)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [accessState, setAccessState] = useState('signed_out')
  const [serviceData, setServiceData] = useState({ pickups: [], returns: [] })
  const [statusMap, setStatusMap] = useState({})
  const [loadingServices, setLoadingServices] = useState(false)
  const [updatingItemId, setUpdatingItemId] = useState('')
  const [lastLoadAt, setLastLoadAt] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    void configureAuthPersistence()
  }, [])

  useEffect(() => {
    if (pin) {
      sessionStorage.setItem(PIN_STORAGE_KEY, pin)
    } else {
      sessionStorage.removeItem(PIN_STORAGE_KEY)
    }
  }, [pin])

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setAccessState('firebase_missing')
      setCheckingAccess(false)
      return () => {}
    }

    const unsubscribe = subscribeToAuthChanges(async (currentUser) => {
      setErrorMessage('')
      setUser(currentUser)

      if (!currentUser) {
        setAccessState('signed_out')
        setCheckingAccess(false)
        return
      }

      setCheckingAccess(true)
      try {
        const accessResult = await checkAllowlist(currentUser.uid)
        setAccessState(accessResult.allowed ? 'allowed' : 'denied')
      } catch (error) {
        setAccessState('denied')
        setErrorMessage(error.message)
      } finally {
        setCheckingAccess(false)
      }
    })

    return unsubscribe
  }, [])

  const canLoadData = accessState === 'allowed' && Boolean(pin)

  const loadServiceData = useCallback(async ({ force = false } = {}) => {
    if (!canLoadData) {
      if (!pin) {
        setErrorMessage('Introduz o PIN da API para carregar serviços.')
      }
      return
    }

    setErrorMessage('')
    setLoadingServices(true)
    try {
      const data = await fetchServiceDay({
        date: selectedDate,
        pin,
        forceRefresh: force,
      })
      setServiceData(data)
      setLastLoadAt(new Date().toISOString())
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setLoadingServices(false)
    }
  }, [canLoadData, pin, selectedDate])

  useEffect(() => {
    if (canLoadData) {
      void loadServiceData()
    }
  }, [canLoadData, loadServiceData, selectedDate])

  useEffect(() => {
    if (accessState !== 'allowed') {
      setStatusMap({})
      return () => {}
    }

    return subscribeToDateStatus(
      selectedDate,
      (nextStatusMap) => {
        setStatusMap(nextStatusMap)
      },
      (error) => {
        setErrorMessage(error.message)
      },
    )
  }, [accessState, selectedDate])

  const handleSignIn = async () => {
    setErrorMessage('')
    try {
      await signInWithGoogle()
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleSignOut = async () => {
    setErrorMessage('')
    await signOutUser()
    setServiceData({ pickups: [], returns: [] })
    setStatusMap({})
  }

  const handleToggleDone = async (item, done) => {
    if (accessState !== 'allowed') {
      return
    }

    setUpdatingItemId(item.itemId)
    setErrorMessage('')

    try {
      await setItemDoneState({
        date: selectedDate,
        item,
        done,
        user,
      })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setUpdatingItemId('')
    }
  }

  const statusLine = useMemo(() => {
    if (!lastLoadAt) {
      return 'Ainda sem carregamento para esta data.'
    }

    const formatted = new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(lastLoadAt))

    return `Última atualização manual: ${formatted}`
  }, [lastLoadAt])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Service Tracker</p>
          <h1>Operação diária</h1>
          <p className="subtle-text">Entregas e recolhas sincronizadas em tempo real (checklist da equipa).</p>
        </div>

        <AuthPanel
          user={user}
          accessState={accessState}
          checkingAccess={checkingAccess}
          pin={pin}
          onPinChange={setPin}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />
      </header>

      <DateNavigator
        date={selectedDate}
        onDateChange={setSelectedDate}
        onManualRefresh={() => loadServiceData({ force: forceRefresh })}
        forceRefresh={forceRefresh}
        onForceRefreshChange={setForceRefresh}
        loading={loadingServices}
      />

      <p className="status-line">{statusLine}</p>

      {accessState === 'firebase_missing' ? (
        <p className="error-banner">Configuração Firebase em falta. Preenche as variáveis `VITE_FIREBASE_*`.</p>
      ) : null}

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <main className="service-grid">
        <ServicePane
          title="Entregas"
          items={serviceData.pickups}
          statusMap={statusMap}
          onToggleDone={handleToggleDone}
          disabled={accessState !== 'allowed' || updatingItemId !== ''}
        />

        <ServicePane
          title="Recolhas"
          items={serviceData.returns}
          statusMap={statusMap}
          onToggleDone={handleToggleDone}
          disabled={accessState !== 'allowed' || updatingItemId !== ''}
        />
      </main>
    </div>
  )
}

export default App
