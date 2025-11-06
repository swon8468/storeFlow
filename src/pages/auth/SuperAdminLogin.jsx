import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { loginSuperAdmin } from '../../services/authService';

export function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      message.warning('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      console.log('로그인 시도:', email);
      const result = await loginSuperAdmin(email, password);
      console.log('로그인 성공:', result);
      message.success('로그인 성공');
      navigate('/super/stores');
    } catch (error) {
      console.error('로그인 오류:', error);
      console.error('오류 코드:', error.code);
      console.error('오류 메시지:', error.message);
      console.error('전체 오류 객체:', error);
      
      // 에러 메시지 표시
      const errorMessage = error.message || error.code || '로그인에 실패했습니다.';
      message.error({
        content: errorMessage,
        duration: 5,
        style: {
          marginTop: '20vh',
        },
      });
      
      // 콘솔에도 에러 출력
      if (error.code) {
        console.error('Firebase 오류 코드:', error.code);
      }
    } finally {
      setLoading(false);
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
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      padding: '20px',
      margin: 0,
      overflow: 'auto'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 400,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
        }}
        title={
          <div style={{ textAlign: 'center' }}>
            <SafetyOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>최고관리자</div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              storeFlow 관리 시스템
            </div>
          </div>
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <Input
            prefix={<UserOutlined />}
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onPressEnter={handleLogin}
            style={{ marginBottom: '12px' }}
          />
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handleLogin}
          />
        </div>
        <Button
          type="primary"
          block
          onClick={handleLogin}
          loading={loading}
          size="large"
        >
          로그인
        </Button>
      </Card>
    </div>
  );
}

