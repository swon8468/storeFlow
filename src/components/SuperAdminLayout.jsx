import { Layout as AntLayout, Menu, Avatar, Dropdown, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { signOut } from '../services/authService';
import {
  ShopOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

export function SuperAdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { account } = useSession();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/super');
  };

  const menuItems = [
    {
      key: '/super/stores',
      icon: <ShopOutlined />,
      label: '매장 관리',
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '프로필',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      handleLogout();
    } else if (key === 'profile') {
      // 프로필 페이지는 추후 구현
      console.log('프로필');
    }
  };

  const handleSideMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <AntLayout style={{ minHeight: '100vh', width: '100%' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div style={{ padding: '16px', color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>
          storeFlow
        </div>
        <div style={{ padding: '16px', color: '#fff', fontSize: '12px', opacity: 0.7 }}>
          최고관리자
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleSideMenuClick}
        />
      </Sider>
      <AntLayout style={{ marginLeft: 200, width: 'calc(100% - 200px)', minHeight: '100vh' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            storeFlow 관리 시스템
          </div>
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleMenuClick,
            }}
            placement="bottomRight"
          >
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{account?.name || account?.username || '최고관리자'}</span>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ 
          margin: '24px', 
          padding: '24px', 
          background: 'transparent',
          minHeight: 'calc(100vh - 112px)',
          width: '100%',
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

