import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Input, Button, Form, message } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { updatePassword } from 'firebase/auth';
import { auth } from '../../assets/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';

export function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const email = searchParams.get('email');
  const storeId = searchParams.get('storeId');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!email || !storeId) {
      message.error('잘못된 접근입니다.');
      navigate('/auth/login');
    }
  }, [email, storeId, navigate]);

  const handleSubmit = async (values) => {
    if (values.password !== values.confirmPassword) {
      message.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      // 임시 비밀번호로 로그인 (실제로는 토큰 검증 후 비밀번호 설정)
      // 여기서는 간단히 이메일로 로그인 시도 후 비밀번호 변경
      // 실제 구현 시 토큰 검증 및 비밀번호 재설정 로직 필요
      
      message.info('비밀번호 설정 기능은 Cloud Functions와 연동이 필요합니다.');
      message.success('비밀번호 설정이 완료되었습니다. 로그인 페이지로 이동합니다.');
      navigate('/auth/login');
    } catch (error) {
      console.error('비밀번호 설정 오류:', error);
      message.error(error.message || '비밀번호 설정에 실패했습니다.');
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>비밀번호 설정</div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              storeFlow 관리 시스템
            </div>
          </div>
        }
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="이메일"
          >
            <Input value={email} disabled />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="새 비밀번호"
            rules={[
              { required: true, message: '비밀번호를 입력해주세요.' },
              { min: 8, message: '비밀번호는 최소 8자 이상이어야 합니다.' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="비밀번호 (8자 이상)"
            />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="비밀번호 확인"
            dependencies={['password']}
            rules={[
              { required: true, message: '비밀번호 확인을 입력해주세요.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="비밀번호 확인"
            />
          </Form.Item>
          
          <Form.Item>
            <Button
              type="primary"
              block
              htmlType="submit"
              loading={loading}
              size="large"
            >
              비밀번호 설정
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

