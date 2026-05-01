import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { StatusBar, Style } from '@capacitor/status-bar'

// Per Capacitor docs: on Android 15+, only setStyle() works.
// backgroundColor and setOverlaysWebView are no longer available on Android 15+.
// Black background is controlled via styles.xml (android:statusBarColor = #000000)
const initStatusBar = async () => {
  try {
    await StatusBar.setStyle({ style: Style.Dark }) // Dark = dark background, light/white icons
    await StatusBar.show()
  } catch (e) {
    // Not on native — silently ignore in browser
  }
}
initStatusBar()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
