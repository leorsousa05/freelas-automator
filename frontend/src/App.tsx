import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'

function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<div className="text-2xl font-bold">Dashboard</div>} />
          <Route path="/accounts" element={<div className="text-2xl font-bold">Accounts</div>} />
          <Route path="/projects" element={<div className="text-2xl font-bold">Projects</div>} />
          <Route path="/messages" element={<div className="text-2xl font-bold">Messages</div>} />
          <Route path="/proposals" element={<div className="text-2xl font-bold">Proposals</div>} />
          <Route path="/jobs" element={<div className="text-2xl font-bold">Jobs</div>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
