import React from 'react';
import { NavLink } from 'react-router-dom';
import './TabBar.css';

const tabs = [
  { to: '/', icon: '🗂', label: 'Archivo', exact: true },
  { to: '/trackers', icon: '📊', label: 'Trackers' },
  { to: '/crafts', icon: '✂️', label: 'Crafts' },
  { to: '/books', icon: '📚', label: 'Books' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function TabBar() {
  return (
    <nav className="tab-bar">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.exact}
          className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
