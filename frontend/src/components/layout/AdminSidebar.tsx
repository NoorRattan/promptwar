import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const adminLinks = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin', end: true },
  { id: 'heatmap', label: 'Heatmap', path: '/admin/heatmap' },
  { id: 'queues', label: 'Queues', path: '/admin/queues' },
  { id: 'orders', label: 'Orders', path: '/admin/orders' },
  { id: 'staff', label: 'Staff', path: '/admin/staff' },
  { id: 'seats', label: 'Seats', path: '/admin/seats' },
  { id: 'emergency', label: 'Emergency', path: '/admin/emergency' },
  { id: 'analytics', label: 'Analytics', path: '/admin/analytics' },
  { id: 'incidents', label: 'Incidents', path: '/admin/incidents' },
];

export const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <nav 
      aria-label="Admin navigation"
      className="w-64 bg-slate-900 border-r border-slate-700 h-screen flex flex-col fixed left-0 top-0 z-20"
    >
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold font-mono text-white tracking-widest flex items-center gap-2">
          CrowdIQ
          <span className="bg-blue-600 text-xs text-white px-2 py-0.5 rounded-full font-sans tracking-normal">
            Admin
          </span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-1 px-3">
          {adminLinks.map((link) => (
            <li key={link.id}>
              <NavLink
                to={link.path}
                end={link.end}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                    isActive 
                      ? 'bg-slate-800 text-blue-400 border-r-2 border-blue-400' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 border-t border-slate-700 space-y-4">
        <button
          onClick={() => navigate('/admin/emergency')}
          aria-label="Open emergency activation panel"
          className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
        >
          <span>⚡</span> Activate Emergency
        </button>

        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-slate-400 truncate pr-2">admin@crowdiq.com</span>
          <button 
            className="text-slate-500 hover:text-slate-300"
            aria-label="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};
