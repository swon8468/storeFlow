import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Tabs, Input, Button, Select, message, Spin } from 'antd';
import { ShopOutlined, UserOutlined, LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons';
import { getStores, loginWithStore, loginStoreAdmin } from '../../services/authService';

const { TabPane } = Tabs;
const { Option } = Select;

export function StoreSelect() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const navigate = useNavigate();
  
  // 사원 로그인 필드
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [staffUsername, setStaffUsername] = useState('');
  
  // 매장 담당자 로그인 필드
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      console.log('매장 목록 로드 시작');
      const storesData = await getStores();
      console.log('매장 목록 로드 결과:', storesData);
      setStores(storesData);
      if (storesData.length === 0) {
        console.warn('활성화된 매장이 없습니다.');
      }
    } catch (error) {
      console.error('매장 목록 로드 오류:', error);
      console.error('오류 상세:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      message.error(`매장 목록을 불러오는데 실패했습니다: ${error.message || error.code || '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async () => {
    if (!selectedStoreId) {
      message.warning('매장을 선택해주세요.');
      return;
    }
    if (!staffUsername || staffUsername.trim() === '') {
      message.warning('사원 ID를 입력해주세요.');
      return;
    }

    console.log('사원 로그인 버튼 클릭:', { selectedStoreId, staffUsername });
    setLoginLoading(true);
    
    try {
      console.log('loginWithStore 호출 전');
      const result = await loginWithStore(selectedStoreId, staffUsername.trim());
      console.log('loginWithStore 결과:', result);
      message.success('로그인 성공');
      
      // 페이지 새로고침하여 세션 정보 로드
      window.location.href = '/app/reservations';
    } catch (error) {
      console.error('사원 로그인 실패:', error);
      console.error('에러 상세:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      message.error(error.message || '로그인에 실패했습니다.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleManagerLogin = async () => {
    if (!managerEmail || !managerPassword) {
      message.warning('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoginLoading(true);
    try {
      const result = await loginStoreAdmin(managerEmail, managerPassword);
      message.success('로그인 성공');
      navigate('/app/reservations');
    } catch (error) {
      message.error(error.message || '로그인에 실패했습니다.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      margin: 0,
      overflow: 'auto'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 500,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
        }}
        title={
          <div style={{ textAlign: 'center' }}>
            <ShopOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>storeFlow</div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              로그인
            </div>
          </div>
        }
      >
        <Tabs defaultActiveKey="staff" centered>
          <TabPane 
            tab={
              <span>
                <UserOutlined />
                사원 로그인
              </span>
            } 
            key="staff"
          >
            <div style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  매장 선택
                </label>
                <Select
                  placeholder="매장을 선택하세요"
                  style={{ width: '100%' }}
                  value={selectedStoreId}
                  onChange={setSelectedStoreId}
                  loading={loading}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {stores.map((store) => (
                    <Option key={store.id} value={store.id}>
                      {store.name}
                    </Option>
                  ))}
                </Select>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  사원 ID
                </label>
                <Input
                  prefix={<UserOutlined />}
                  placeholder="사원 ID를 입력하세요"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  onPressEnter={handleStaffLogin}
                />
              </div>
              
              
              <Button
                type="primary"
                block
                onClick={handleStaffLogin}
                loading={loginLoading}
                size="large"
              >
                로그인
              </Button>
            </div>
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <ShopOutlined />
                매장 담당자 로그인
              </span>
            } 
            key="manager"
          >
            <div style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  이메일
                </label>
                <Input
                  prefix={<MailOutlined />}
                  placeholder="이메일을 입력하세요"
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  onPressEnter={handleManagerLogin}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  비밀번호
                </label>
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="비밀번호를 입력하세요"
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  onPressEnter={handleManagerLogin}
                />
              </div>
              
              <Button
                type="primary"
                block
                onClick={handleManagerLogin}
                loading={loginLoading}
                size="large"
              >
                로그인
              </Button>
            </div>
          </TabPane>
        </Tabs>
        <div style={{ 
          marginTop: '20px', 
          paddingTop: '20px', 
          borderTop: '1px solid #f0f0f0',
          textAlign: 'center'
        }}>
          <Link to="/auth/super" style={{ color: '#1890ff', textDecoration: 'none' }}>
            <SafetyOutlined style={{ marginRight: '4px' }} />
            최고관리자 로그인
          </Link>
        </div>
      </Card>
    </div>
  );
}
