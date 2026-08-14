import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { appBasename } from './lib/paths'
import { ZineProvider } from './store/ZineContext'
import { Landing } from './views/Landing'
import { Studio } from './views/Studio'
import { Editor } from './views/Editor'
import { Preview } from './views/Preview'
import { Explore } from './views/Explore'
import { Board } from './views/Board'
import { Profile } from './views/Profile'
import { Share } from './views/Share'
import { JamPage } from './views/Jam'
import { Mail } from './views/Mail'
import { NotFound } from './views/NotFound'

export default function App() {
  return (
    <ZineProvider>
      <BrowserRouter basename={appBasename()}>
        <div className="app-shell">
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <div id="main">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/board" element={<Board />} />
              <Route path="/mail/:handle" element={<Mail />} />
              <Route path="/mail" element={<Mail />} />
              <Route path="/jam/:id" element={<JamPage />} />
              <Route path="/u/:handle" element={<Profile />} />
              <Route path="/edit/:id" element={<Editor />} />
              <Route path="/z/:id" element={<Preview />} />
              <Route path="/s" element={<Share />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </ZineProvider>
  )
}
