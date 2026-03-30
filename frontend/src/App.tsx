import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { useAdminAuthStore } from './store/admin-auth.store';
import { ErrorBoundary } from './components/ErrorBoundary';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Dashboard pages
import Dashboard from './pages/dashboard/Dashboard';
import ServerList from './pages/dashboard/ServerList';

// Server pages
import ServerDetail from './pages/server/ServerDetail';
import InstallProgress from './pages/server/InstallProgress';

// OpenClaw pages
import OpenClawStatus from './pages/openclaw/OpenClawStatus';
import ConfigEditor from './pages/openclaw/ConfigEditor';
import OpenClawDashboard from './pages/openclaw/OpenClawDashboard';

// Model/Channel/Skill pages
import ModelManager from './pages/model/ModelManager';
import ChannelManager from './pages/channel/ChannelManager';
import SkillManager from './pages/skill/SkillManager';

// Guest pages
import GuestDeploy from './pages/guest/GuestDeploy';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTickets from './pages/admin/AdminTickets';
import AdminAlerts from './pages/admin/AdminAlerts';
import AdminSettings from './pages/admin/AdminSettings';
import AdminLogs from './pages/admin/AdminLogs';

// Layout
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public routes - no layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/guest" element={<GuestDeploy />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected routes - with layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                  <Header />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6 overflow-auto">
                      <Dashboard />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/servers"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                  <Header />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6 overflow-auto">
                      <ServerList />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/servers/:id"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                  <Header />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6 overflow-auto">
                      <ServerDetail />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/install/:id"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                  <Header />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6 overflow-auto">
                      <InstallProgress />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/openclaw/:id"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                  <Header />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6 overflow-auto">
                      <OpenClawDashboard />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/config/:id"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                  <Header />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6 overflow-auto">
                      <ConfigEditor />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/models"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                  <Header />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6 overflow-auto">
                      <ModelManager />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/channels"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                  <Header />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6 overflow-auto">
                      <ChannelManager />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/skills"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                  <Header />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6 overflow-auto">
                      <SkillManager />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Admin routes - separate layout */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminProtectedRoute>
                <AdminUsers />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/tickets"
            element={
              <AdminProtectedRoute>
                <AdminTickets />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/alerts"
            element={
              <AdminProtectedRoute>
                <AdminAlerts />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminProtectedRoute>
                <AdminSettings />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <AdminProtectedRoute>
                <AdminLogs />
              </AdminProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
