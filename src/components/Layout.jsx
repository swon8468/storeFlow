import { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Button, Drawer } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { usePermissions } from '../hooks/usePermissions';
import { signOut } from '../services/authService';
import {
  CalendarOutlined,
  DollarOutlined,
  UserOutlined,
  SettingOutlined,
  FileTextOutlined,
  LogoutOutlined,
  ShopOutlined,
  MenuOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

export function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { account } = useSession();
  const permissions = usePermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 992);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const menuItems = [
    {
      key: '/app/reservations',
      icon: <CalendarOutlined />,
      label: '예약 관리',
      show: true,
    },
    {
      key: '/app/prepay',
      icon: <DollarOutlined />,
      label: '선결제 관리',
      show: true,
    },
    {
      key: '/app/hr',
      icon: <FileTextOutlined />,
      label: '근무/급여',
      show: permissions.canViewHR,
    },
    {
      key: '/app/settings',
      icon: <SettingOutlined />,
      label: '설정',
      show: permissions.canManageStore,
    },
  ]
    .filter(item => item.show)
    .map(({ show, ...item }) => item); // show 속성 제거

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '프로필',
    },
    ...(permissions.canAccessSuper
      ? [
          {
            key: 'super',
            icon: <ShopOutlined />,
            label: '최고관리자',
          },
        ]
      : []),
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
    } else if (key === 'super') {
      navigate('/super/stores');
    } else if (key === 'profile') {
      navigate('/app/profile');
    } else {
      navigate(key);
    }
  };

  const handleSideMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const menuContent = (
    <>
      <div style={{ padding: '16px', color: isMobile ? '#000' : '#fff', fontWeight: 'bold', fontSize: '18px' }}>
        storeFlow
      </div>
      <Menu
        theme={isMobile ? 'light' : 'dark'}
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleSideMenuClick}
      />
    </>
  );

  return (
    <AntLayout style={{ minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      {!isMobile && (
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
          {menuContent}
        </Sider>
      )}
      
      {isMobile && (
        <Drawer
          title="storeFlow"
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          bodyStyle={{ padding: 0 }}
          width={280}
        >
          {menuContent}
        </Drawer>
      )}

      <AntLayout 
        style={{ 
          marginLeft: isMobile ? 0 : 200, 
          width: isMobile ? '100%' : 'calc(100% - 200px)', 
          minHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        <Header
          style={{
            padding: isMobile ? '0 16px' : '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                style={{ fontSize: '18px' }}
              />
            )}
            <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold' }}>
              {account?.storeName || 'storeFlow'}
            </div>
          </div>
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleMenuClick,
            }}
            placement="bottomRight"
          >
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: isMobile ? '4px 8px' : '4px 12px' }}>
              <Avatar icon={<UserOutlined />} size={isMobile ? 'small' : 'default'} />
              {!isMobile && <span>{account?.name || account?.username || '사용자'}</span>}
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ 
          margin: isMobile ? '16px 8px' : '24px', 
          padding: isMobile ? '16px' : '24px', 
          background: 'transparent',
          minHeight: 'calc(100vh - 64px)',
          width: '100%',
          overflow: 'auto',
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

