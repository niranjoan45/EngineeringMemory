import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Clear any stale diagnosis state from previous sessions
localStorage.removeItem('latest_diagnosis');
sessionStorage.removeItem('latest_diagnosis');
sessionStorage.removeItem('active_session_diagnosed');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
