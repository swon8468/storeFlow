import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Tabs, Switch, Table, Modal, Space, Popconfirm } from 'antd';
import { UserOutlined, BellOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useSession } from '../../hooks/useSession';
import { usePermissions } from '../../hooks/usePermissions';
import { updateDocument, getCollection, createDocument, deleteDocument } from '../../services/firestoreService';

const { TabPane } = Tabs;

export function Settings() {
  const { account, storeId } = useSession();
  const permissions = usePermissions();
  const [form] = Form.useForm();
  const [staffForm] = Form.useForm();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateStatus, setDuplicateStatus] = useState(null);
  const [usernameValue, setUsernameValue] = useState('');

  useEffect(() => {
    if (storeId && permissions.canManageStaff) {
      loadStaffList();
    }
  }, [storeId, permissions.canManageStaff]);

  const loadStaffList = async () => {
    if (!storeId) {
      console.warn('storeId가 없어 사원 목록을 불러올 수 없습니다.');
      return;
    }
    
    setLoading(true);
    try {
      console.log('사원 목록 조회 시작:', { storeId });
      // 인덱스 없이 작동하도록 storeId로만 필터링하고 클라이언트에서 필터링 및 정렬
      const allAccounts = await getCollection('accounts', {
        filters: [
          { field: 'storeId', operator: '==', value: storeId },
        ],
      });
      
      // 클라이언트 측에서 role 필터링 및 정렬
      const staffAccounts = allAccounts
        .filter(account => account.role === 'staff')
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds || 0) * 1000;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds || 0) * 1000;
          return bTime - aTime; // 내림차순
        });
      
      console.log('사원 목록 조회 결과:', staffAccounts);
      setStaffList(staffAccounts);
    } catch (error) {
      console.error('사원 목록 조회 오류:', error);
      console.error('오류 상세:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      message.error(`사원 목록을 불러오는데 실패했습니다: ${error.message || error.code || '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameDuplicate = async (username) => {
    if (!username) {
      message.warning('아이디를 입력해주세요.');
      return;
    }
    
    setCheckingDuplicate(true);
    try {
      const existingStaff = await getCollection('accounts', {
        filters: [
          { field: 'storeId', operator: '==', value: storeId },
          { field: 'username', operator: '==', value: username },
          { field: 'role', operator: '==', value: 'staff' },
        ],
      });
      
      // 수정 중이고 현재 사원의 아이디면 통과
      if (editingStaff && existingStaff.length === 1 && existingStaff[0].id === editingStaff.id) {
        setDuplicateStatus(false);
        message.success('사용 가능한 아이디입니다.');
      } else if (existingStaff.length > 0) {
        setDuplicateStatus(true);
        message.error('이미 사용 중인 아이디입니다.');
      } else {
        setDuplicateStatus(false);
        message.success('사용 가능한 아이디입니다.');
      }
    } catch (error) {
      console.error('아이디 중복 확인 오류:', error);
      message.error('중복 확인에 실패했습니다.');
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const handleCreateStaff = () => {
    setEditingStaff(null);
    staffForm.resetFields();
    setDuplicateStatus(null);
    setUsernameValue('');
    setStaffModalVisible(true);
  };

  const handleEditStaff = (record) => {
    setEditingStaff(record);
    setUsernameValue(record.username || '');
    staffForm.setFieldsValue({
      name: record.name,
      username: record.username,
    });
    setDuplicateStatus(null);
    setStaffModalVisible(true);
  };

  const handleDeleteStaff = async (staffId) => {
    try {
      await deleteDocument('accounts', staffId);
      message.success('사원 계정이 삭제되었습니다.');
      loadStaffList();
    } catch (error) {
      message.error('사원 계정 삭제에 실패했습니다.');
    }
  };

  const handleStaffSubmit = async (values) => {
    // 새 사원 생성 시 중복 확인 체크
    if (!editingStaff) {
      if (duplicateStatus === true) {
        message.error('중복 확인을 완료하고 중복이 없는 아이디만 사용할 수 있습니다.');
        return;
      }
      
      if (duplicateStatus === null) {
        message.warning('아이디 중복 확인을 완료해주세요.');
        return;
      }

      try {
        console.log('사원 계정 생성 시작:', { storeId, name: values.name, username: values.username });
        
        if (!storeId) {
          throw new Error('매장 ID가 없습니다. 페이지를 새로고침해주세요.');
        }
        
        // Firestore에 직접 사원 계정 생성 (예약/선결제와 동일한 방식)
        // addCommonFields가 createdAt, updatedAt을 자동으로 추가함
        const accountData = {
          role: 'staff',
          username: values.username,
          storeId: storeId,
          name: values.name,
        };
        
        console.log('Firestore에 사원 계정 생성 중...', accountData);
        const accountId = await createDocument('accounts', accountData);
        console.log('사원 계정 생성 완료, ID:', accountId);
        
        // uid를 문서 ID로 설정
        await updateDocument('accounts', accountId, {
          uid: accountId,
        });
        
        message.success('사원 계정이 생성되었습니다.');
        setStaffModalVisible(false);
        staffForm.resetFields();
        setDuplicateStatus(null);
        setUsernameValue('');
        loadStaffList();
      } catch (error) {
        console.error('사원 계정 생성 오류:', error);
        console.error('오류 상세:', {
          code: error.code,
          message: error.message,
          stack: error.stack,
        });
        message.error(`사원 계정 생성에 실패했습니다: ${error.message || error.code || '알 수 없는 오류'}`);
      }
    } else {
      // 사원 계정 수정
      try {
        await updateDocument('accounts', editingStaff.id, {
          name: values.name,
          username: values.username,
        });
        message.success('사원 계정이 수정되었습니다.');
        setStaffModalVisible(false);
        staffForm.resetFields();
        setDuplicateStatus(null);
        loadStaffList();
      } catch (error) {
        console.error('사원 계정 수정 오류:', error);
        message.error(`사원 계정 수정에 실패했습니다: ${error.message || error.code || '알 수 없는 오류'}`);
      }
    }
  };

  const handleSubmit = async (values) => {
    if (!account) return;

    try {
      await updateDocument('accounts', account.id, values);
      message.success('설정이 저장되었습니다.');
    } catch (error) {
      message.error('설정 저장에 실패했습니다.');
    }
  };

  if (!permissions.canManageStore) {
    return (
      <Card>
        <p>설정 페이지에 접근할 수 있는 권한이 없습니다.</p>
      </Card>
    );
  }

  const staffColumns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '아이디',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '작업',
      key: 'actions',
      render: (_, record) => (
        <div>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditStaff(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="사원 계정 삭제"
            description="정말 이 사원 계정을 삭제하시겠습니까?"
            onConfirm={() => handleDeleteStaff(record.id)}
            okText="삭제"
            cancelText="취소"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              삭제
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Card title="설정">
      <Tabs defaultActiveKey="staff">
        <TabPane
          tab={
            <span>
              <UserOutlined />
              사원 관리
            </span>
          }
          key="staff"
        >
          <div style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateStaff}
            >
              사원 계정 생성
            </Button>
          </div>
          <Table
            dataSource={staffList}
            columns={staffColumns}
            loading={loading}
            rowKey="id"
          />
        </TabPane>
        <TabPane
          tab={
            <span>
              <UserOutlined />
              프로필
            </span>
          }
          key="profile"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              name: account?.name,
              email: account?.email,
            }}
          >
            <Form.Item name="name" label="이름">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="이메일">
              <Input type="email" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                저장
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
        <TabPane
          tab={
            <span>
              <BellOutlined />
              알림 설정
            </span>
          }
          key="notifications"
        >
          <Form layout="vertical">
            <Form.Item label="이메일 알림">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item label="백업 알림">
              <Switch defaultChecked />
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>

      <Modal
        title={editingStaff ? '사원 계정 수정' : '사원 계정 생성'}
        open={staffModalVisible}
        onCancel={() => {
          setStaffModalVisible(false);
          staffForm.resetFields();
          setDuplicateStatus(null);
          setUsernameValue('');
        }}
        onOk={() => staffForm.submit()}
        width={600}
      >
        <Form form={staffForm} onFinish={handleStaffSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="이름"
            rules={[{ required: true, message: '이름을 입력해주세요.' }]}
          >
            <Input placeholder="사원 이름을 입력하세요" />
          </Form.Item>
          
          <Form.Item
            name="username"
            label="아이디"
            rules={[{ required: true, message: '아이디를 입력해주세요.' }]}
            validateStatus={duplicateStatus === true ? 'error' : duplicateStatus === false ? 'success' : ''}
            help={
              duplicateStatus === true ? (
                <span style={{ color: '#ff4d4f' }}>중복</span>
              ) : duplicateStatus === false ? (
                <span style={{ color: '#52c41a' }}>사용 가능</span>
              ) : null
            }
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input 
                placeholder="아이디를 입력하세요" 
                value={usernameValue}
                onChange={(e) => {
                  setUsernameValue(e.target.value);
                  staffForm.setFieldsValue({ username: e.target.value });
                  setDuplicateStatus(null);
                }}
                disabled={duplicateStatus === false && !editingStaff}
              />
              <Button 
                type="default"
                loading={checkingDuplicate}
                onClick={() => {
                  checkUsernameDuplicate(usernameValue);
                }}
                disabled={!usernameValue || usernameValue.trim() === '' || (duplicateStatus === false && !editingStaff)}
              >
                중복확인
              </Button>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
