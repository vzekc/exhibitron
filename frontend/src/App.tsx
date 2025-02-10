import * as React from 'react'
import QrTableScanner from './QrTableScanner.tsx'
import './App.css'
import { BrowserRouter as Router, Link, Route, Routes } from 'react-router-dom'
import Navbar from './Navbar.tsx'

const App = () => {
  return (
    <Router>
      <div className="App">
        <Navbar/>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/table" element={<QrTableScanner />} />
          <Route path="/table/:id" element={<div>table</div>} />
          <Route path="/exhibition" element={<div>all exhibitions</div>} />
          <Route path="/exhibition/:id" element={<div>individual exhibition</div>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
