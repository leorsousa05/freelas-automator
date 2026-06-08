import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<div className="text-2xl font-bold">Dashboard</div>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
