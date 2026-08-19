import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { appBasename } from './lib/paths'
import { ZineProvider } from './store/ZineContext'
import { ToastStack } from './components/ToastStack'
import { Landing } from './views/Landing'
import { Studio } from './views/Studio'

const Editor = lazy(() => import('./views/Editor').then((m) => ({ default: m.Editor })))
const Preview = lazy(() => import('./views/Preview').then((m) => ({ default: m.Preview })))
const Explore = lazy(() => import('./views/Explore').then((m) => ({ default: m.Explore })))
const Board = lazy(() => import('./views/Board').then((m) => ({ default: m.Board })))
const Profile = lazy(() => import('./views/Profile').then((m) => ({ default: m.Profile })))
const Share = lazy(() => import('./views/Share').then((m) => ({ default: m.Share })))
const Cork = lazy(() => import('./views/Cork').then((m) => ({ default: m.Cork })))
const Fest = lazy(() => import('./views/Fest').then((m) => ({ default: m.Fest })))
const JamPage = lazy(() => import('./views/Jam').then((m) => ({ default: m.JamPage })))
const Mail = lazy(() => import('./views/Mail').then((m) => ({ default: m.Mail })))
const Help = lazy(() => import('./views/Help').then((m) => ({ default: m.Help })))
const NotFound = lazy(() => import('./views/NotFound').then((m) => ({ default: m.NotFound })))

function RouteFallback() {
  return (
    <div className="studio" data-vibe="miles">
      <div className="sticker" style={{ margin: '20vh auto', width: 'fit-content' }}>
        flipping pages…
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ZineProvider>
      <BrowserRouter basename={appBasename()}>
        <div className="app-shell">
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <div id="main">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/studio" element={<Studio />} />
                <Route path="/help" element={<Help />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/board" element={<Board />} />
                <Route path="/fest" element={<Fest />} />
                <Route path="/cork" element={<Cork />} />
                <Route path="/mail/:handle" element={<Mail />} />
                <Route path="/mail" element={<Mail />} />
                <Route path="/jam/:id" element={<JamPage />} />
                <Route path="/u/:handle" element={<Profile />} />
                <Route path="/edit/:id" element={<Editor />} />
                <Route path="/z/:id" element={<Preview />} />
                <Route path="/s" element={<Share />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
          <ToastStack />
        </div>
      </BrowserRouter>
    </ZineProvider>
  )
}
