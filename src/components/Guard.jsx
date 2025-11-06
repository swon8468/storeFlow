import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { Spin } from 'antd';

/**
 * 계정 유형별 기본 페이지 반환
 */
function getDefaultRouteByRole(role) {
  switch (role) {
    case 'superAdmin':
      return '/super/stores';
    case 'storeAdmin':
    case 'staff':
      return '/app/reservations';
    default:
      return '/auth/login';
  }
}

/**
 * 권한 기반 라우트 가드
 */
export function Guard({ children, requiredRole = null, requiredPermission = null }) {
  const { account, loading, isAuthenticated, user } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Firebase Auth 또는 staff 세션 확인
  const hasSession = isAuthenticated || (user && account);
  if (!hasSession) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // superAdmin이 일반 앱 페이지에 접근하려고 하면 super 페이지로 리다이렉트
  if (account?.role === 'superAdmin') {
    return <Navigate to="/super/stores" replace />;
  }

  if (requiredRole && account?.role !== requiredRole) {
    // 권한이 없으면 해당 역할의 기본 페이지로 리다이렉트
    const defaultRoute = getDefaultRouteByRole(account?.role);
    return <Navigate to={defaultRoute} replace />;
  }

  if (requiredPermission) {
    // 권한 체크 로직 (추후 확장 가능)
    // 예: requiredPermission = 'prepay:charge'
  }

  return children;
}

/**
 * Super Admin 전용 가드
 */
export function SuperAdminGuard({ children }) {
  const { account, loading, isAuthenticated } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/super" state={{ from: location }} replace />;
  }

  // superAdmin이 아니면 해당 역할의 기본 페이지로 리다이렉트
  if (account?.role !== 'superAdmin') {
    const defaultRoute = getDefaultRouteByRole(account?.role);
    return <Navigate to={defaultRoute} replace />;
  }

  return children;
}

