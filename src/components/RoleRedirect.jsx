import { Navigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { Spin } from 'antd';

/**
 * 계정 유형에 따라 올바른 페이지로 리다이렉트
 */
export function RoleRedirect() {
  const { account, loading } = useSession();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!account) {
    return <Navigate to="/auth/login" replace />;
  }

  // 계정 유형별 기본 페이지로 리다이렉트
  switch (account.role) {
    case 'superAdmin':
      return <Navigate to="/super/stores" replace />;
    case 'storeAdmin':
    case 'staff':
      return <Navigate to="/app/reservations" replace />;
    default:
      return <Navigate to="/auth/login" replace />;
  }
}

