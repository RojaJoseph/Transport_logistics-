import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      {/* Fixed-width sidebar */}
      <Sidebar />

      {/* Right column: topbar + scrollable content */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <Topbar />

        {/* Page content */}
        <main style={{
          flex: 1,
          overflow: 'hidden',       /* let each page control its own scroll */
          position: 'relative',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
