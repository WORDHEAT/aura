import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { TableProvider } from './context/TableContext.tsx'
import { SettingsProvider } from './context/SettingsContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <TableProvider>
          <App />
        </TableProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
