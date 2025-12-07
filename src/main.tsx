import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './App.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { TableProvider } from './context/TableContext.tsx'
import { SettingsProvider } from './context/SettingsContext.tsx'
import { PublicWorkspaceView } from './components/PublicWorkspaceView.tsx'
import { SharedLinkView } from './components/SharedLinkView.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <Routes>
              <Route path="/workspace/:workspaceId" element={<PublicWorkspaceView />} />
              <Route path="/share/:token" element={<SharedLinkView />} />
              <Route path="/*" element={
                <TableProvider>
                  <App />
                </TableProvider>
              } />
            </Routes>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
