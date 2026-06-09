import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Projects from './pages/Projects'
import Messages from './pages/Messages'
import Proposals from './pages/Proposals'

function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/jobs" element={<div className="text-2xl font-bold">Jobs</div>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
