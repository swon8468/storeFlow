import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import { Layout } from './components/Layout';
import { SuperAdminLayout } from './components/SuperAdminLayout';
import { Guard, SuperAdminGuard } from './components/Guard';
import { RoleRedirect } from './components/RoleRedirect';
import { StoreSelect } from './pages/auth/StoreSelect';
import { SuperAdminLogin } from './pages/auth/SuperAdminLogin';
import { SetPassword } from './pages/auth/SetPassword';
import { Reservations } from './pages/app/Reservations';
import { Prepay } from './pages/app/Prepay';
import { Settings } from './pages/app/Settings';
import { HR } from './pages/hr';
import { Stores } from './pages/super/Stores';
import './styles/globals.css';

function App() {
  return (
    <ConfigProvider locale={koKR}>
      <BrowserRouter>
        <Routes>
          {/* 인증 페이지 */}
          <Route path="/auth/login" element={<StoreSelect />} />
          <Route path="/auth/super" element={<SuperAdminLogin />} />
          <Route path="/auth/set-password" element={<SetPassword />} />

          {/* Super Admin 전용 */}
          <Route
            path="/super/*"
            element={
              <SuperAdminGuard>
                <SuperAdminLayout>
                  <Routes>
                    <Route path="stores" element={<Stores />} />
                    <Route path="*" element={<Navigate to="/super/stores" replace />} />
                  </Routes>
                </SuperAdminLayout>
              </SuperAdminGuard>
            }
          />

          {/* 일반 앱 페이지 (storeAdmin, staff 전용) */}
          <Route
            path="/app/*"
            element={
              <Guard>
                <Layout>
                  <Routes>
                    <Route path="reservations" element={<Reservations />} />
                    <Route path="prepay" element={<Prepay />} />
                    <Route path="hr" element={<HR />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/app/reservations" replace />} />
                  </Routes>
                </Layout>
              </Guard>
            }
          />

          {/* 기본 경로 - 계정 유형에 따라 자동 리다이렉트 */}
          <Route path="/" element={<RoleRedirect />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
