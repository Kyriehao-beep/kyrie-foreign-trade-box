import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import './index.css'

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

// Restore deep links rewritten by the GitHub Pages 404.html fallback (?p=/route).
const initialParams = new URLSearchParams(window.location.search)
const redirectPath = initialParams.get('p')
if (redirectPath) {
  const query = initialParams.get('q')
  const target = redirectPath + (query ? `?${query.replace(/~and~/g, '&')}` : '') + window.location.hash
  window.history.replaceState(null, '', target)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
