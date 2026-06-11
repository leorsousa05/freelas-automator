import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import MobileNav from './components/layout/MobileNav'
import PageWrapper from './components/layout/PageWrapper'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Projects from './pages/Projects'
import Messages from './pages/Messages'
import Proposals from './pages/Proposals'
import Jobs from './pages/Jobs'

function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-body transition-colors">
      <Sidebar />
      <div className="md:ml-64">
        <TopBar />
        <main className="pt-16 pb-20 md:pb-6 px-4 md:px-6 lg:px-8 min-h-screen overflow-auto">
          <AnimatePresence mode="wait">
            <Routes>
              <Route
                path="/"
                element={
                  <PageWrapper>
                    <Dashboard />
                  </PageWrapper>
                }
              />
              <Route
                path="/accounts"
                element={
                  <PageWrapper>
                    <Accounts />
                  </PageWrapper>
                }
              />
              <Route
                path="/projects"
                element={
                  <PageWrapper>
                    <Projects />
                  </PageWrapper>
                }
              />
              <Route
                path="/messages"
                element={
                  <PageWrapper>
                    <Messages />
                  </PageWrapper>
                }
              />
              <Route
                path="/proposals"
                element={
                  <PageWrapper>
                    <Proposals />
                  </PageWrapper>
                }
              />
              <Route
                path="/jobs"
                element={
                  <PageWrapper>
                    <Jobs />
                  </PageWrapper>
                }
              />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

export default App
