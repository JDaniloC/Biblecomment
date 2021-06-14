import React, { useEffect } from 'react'
import Routes from './routes'

import './App.css'
import './Responsive.css'
import { ProfileProvider } from './contexts/ProfileContext'

function App () {
  useEffect(() => {
    const usesDarkMode = window.matchMedia(
      '(prefers-color-scheme: dark)').matches || false
    const lightSchemeIcon = document.querySelector(
      'link#light-icon')
    const darkSchemeIcon = document.querySelector(
      'link#dark-icon')

    if (usesDarkMode) {
      lightSchemeIcon.remove()
      document.head.append(darkSchemeIcon)
    } else {
      document.head.append(lightSchemeIcon)
      darkSchemeIcon.remove()
    }
  }, [])

  return (
    <div className='container'>
      <h1> Bible Comment </h1>
      <sub> A Program for His Glory </sub>

      <div className='content'>
        <ProfileProvider>
          <Routes />
        </ProfileProvider>
      </div>

      <footer>
        Developed by God through JDaniloC
      </footer>
    </div>
  )
}

export default App
