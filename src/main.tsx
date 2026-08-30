import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import './index.css'
import './features/theme/dark.css'

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

// Restore deep links rewritten by the GitHub Pages 404.html fallback (?p=/route).
// redirectPath is the in-app route (e.g. /admin). The SPA lives under routerBasename,
// so the basename MUST be re-prepended, otherwise replaceState resolves /admin against
// the origin root and strips the subpath -> react-router basename mismatch -> blank screen.
const initialParams = new URLSearchParams(window.location.search)
const redirectPath = initialParams.get('p')
if (redirectPath) {
  const query = initialParams.get('q')
  const inApp = redirectPath + (query ? `?${query.replace(/~and~/g, '&')}` : '') + window.location.hash
  window.history.replaceState(null, '', routerBasename + inApp)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
