import QrTableScanner from './QrTableScanner.tsx'
import './App.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Navbar from './Navbar.tsx'
import Exhibitions from './Exhibitions.tsx'

const App = () => {
  return (
    <Router>
      <div className="App">
        <Navbar/>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/table" element={<QrTableScanner />} />
          <Route path="/table/:id" element={<div>table</div>} />
          <Route path="/exhibition" element={<Exhibitions/>} />
          <Route path="/exhibition/:id" element={<div>individual exhibition</div>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
