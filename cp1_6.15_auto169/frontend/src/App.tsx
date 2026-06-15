import { Routes, Route, useEffect } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import Navbar from '@/components/Navbar';
import NotificationContainer from '@/components/NotificationContainer';
import ToolList from '@/modules/tools/ToolList';
import ToolDetail from '@/modules/tools/ToolDetail';
import ScanPage from '@/modules/scan/ScanPage';
import AdminLogin from '@/modules/admin/AdminLogin';
import AdminDashboard from '@/modules/admin/AdminDashboard';

function App() {
  const checkUpcomingReservations = useAppStore((state) => state.checkUpcomingReservations);

  useEffect(() => {
    const interval = setInterval(() => {
      checkUpcomingReservations();
    }, 5 * 60 * 1000);
    
    checkUpcomingReservations();
    
    return () => clearInterval(interval);
  }, [checkUpcomingReservations]);

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ToolList />} />
          <Route path="/tool/:id" element={<ToolDetail />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </main>
      <NotificationContainer />
    </div>
  );
}

export default App;
