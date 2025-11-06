import { Layout as AntLayout, Menu, Avatar, Dropdown, Button } from 'antd';
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
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

export function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { account } = useSession();
  const permissions = usePermissions();

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
            {account?.storeName || 'storeFlow'}
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
              <span>{account?.name || account?.username || '사용자'}</span>
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

