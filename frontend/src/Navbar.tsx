import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css'; // Optional for styling

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <ul className="navbar-links">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/table">Scan Table QR</Link>
        </li>
        <li>
          <Link to="/exhibition">Exhibitions</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
