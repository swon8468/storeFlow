import { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSession } from '../../hooks/useSession';
import { usePermissions } from '../../hooks/usePermissions';
import { getPrepayCustomers, getPrepayTransactions, subscribeCollection } from '../../services/firestoreService';
import { createDocument, updateDocument, deleteDocument } from '../../services/firestoreService';
import { Timestamp } from 'firebase/firestore';

export function Prepay() {
  const { storeId, account, isFeatureDisabled, disabledFeatures } = useSession();
  const permissions = usePermissions();
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form] = Form.useForm();
  const [transactionForm] = Form.useForm();
  const unsubscribeRefs = useRef([]);

  useEffect(() => {
    if (storeId) {
      setupRealtimeSubscriptions();
    }

    // cleanup 함수
    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
      unsubscribeRefs.current = [];
    };
  }, [storeId]);

  const enrichTransactionData = async (transactions) => {
    const { getDocument } = await import('../../services/firestoreService');
    return await Promise.all(
      transactions.map(async (transaction) => {
        let customerName = '-';
        let staffName = transaction.staffName || '-';
        
        // 고객명 조회
        if (transaction.prepayCustomerId) {
          try {
            const customer = await getDocument('prepayCustomers', transaction.prepayCustomerId);
            if (customer) {
              customerName = customer.name || '-';
            }
          } catch (error) {
            console.error('고객 정보 조회 오류:', error);
          }
        }
        
        // 처리자명 조회 (없는 경우)
        if (transaction.staffId && !transaction.staffName) {
          try {
            const staffAccount = await getDocument('accounts', transaction.staffId);
            if (staffAccount) {
              staffName = staffAccount.name || staffAccount.username || '-';
            }
          } catch (error) {
            console.error('사원 정보 조회 오류:', error);
          }
        }
        
        return {
          ...transaction,
          customerName,
          staffName,
        };
      })
    );
  };

  const setupRealtimeSubscriptions = () => {
    if (!storeId) return;

    // 기존 구독 해제
    unsubscribeRefs.current.forEach(unsubscribe => {
      if (unsubscribe) unsubscribe();
    });
    unsubscribeRefs.current = [];

    setLoading(true);

    // 선결제 고객 실시간 구독
    const unsubscribe1 = subscribeCollection(
      'prepayCustomers',
      {
        filters: [
          { field: 'storeId', operator: '==', value: storeId },
        ],
        orderByField: 'createdAt',
        orderByDirection: 'desc',
      },
      (data, error) => {
        if (error) {
          console.error('선결제 고객 실시간 구독 오류:', error);
          setLoading(false);
          return;
        }
        setCustomers(data);
        setLoading(false);
      }
    );
    unsubscribeRefs.current.push(unsubscribe1);

    // 선결제 거래 내역 실시간 구독 (전체)
    const unsubscribe2 = subscribeCollection(
      'prepayTransactions',
      {
        filters: [
          { field: 'storeId', operator: '==', value: storeId },
        ],
        orderByField: 'createdAt',
        orderByDirection: 'desc',
      },
      async (data, error) => {
        if (error) {
          console.error('선결제 거래 내역 실시간 구독 오류:', error);
          return;
        }
        const enrichedData = await enrichTransactionData(data);
        setTransactions(enrichedData);
      }
    );
    unsubscribeRefs.current.push(unsubscribe2);
  };

  const loadTransactions = async (customerId = null) => {
    if (!storeId) return;
    
    // 고객별 필터링이 필요한 경우 클라이언트 측에서 필터링
    if (customerId) {
      const filtered = transactions.filter(t => t.prepayCustomerId === customerId);
      setTransactions(filtered);
    }
  };

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    form.resetFields();
    setCustomerModalVisible(true);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/-/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handleEditCustomer = (record) => {
    setSelectedCustomer(record);
    form.setFieldsValue({
      name: record.name,
      phone: formatPhoneNumber(record.phone),
      balance: record.balance,
    });
    setCustomerModalVisible(true);
  };

  const handleCustomerSubmit = async (values) => {
    try {
      // 신규 등록 시 전화번호 중복 체크
      if (!selectedCustomer) {
        const { getCollection } = await import('../../services/firestoreService');
        // 전화번호에서 하이픈 제거하여 검색
        const phoneCleaned = values.phone.replace(/-/g, '');
        
        const existingCustomers = await getCollection('prepayCustomers', {
          filters: [
            { field: 'storeId', operator: '==', value: storeId },
            { field: 'phone', operator: '==', value: phoneCleaned },
          ],
        });

        if (existingCustomers.length > 0) {
          const existingCustomer = existingCustomers[0];
          const confirmMerge = window.confirm(
            `전화번호 "${values.phone}"로 등록된 고객이 이미 있습니다.\n\n` +
            `기존 고객: ${existingCustomer.name}\n` +
            `기존 잔액: ${(existingCustomer.balance || 0).toLocaleString()}원\n\n` +
            `기존 고객 정보와 병합하시겠습니까?\n` +
                `(취소를 누르면 등록이 취소됩니다)`
          );

          if (confirmMerge) {
            // 기존 고객 정보 업데이트
            const updatedBalance = (existingCustomer.balance || 0) + (values.balance || 0);
            // 전화번호에서 하이픈 제거하여 저장
            const phoneCleaned = values.phone.replace(/-/g, '');
            
            await updateDocument('prepayCustomers', existingCustomer.id, {
              name: values.name, // 이름은 새로 입력한 것으로 업데이트
              phone: phoneCleaned,
              balance: updatedBalance,
            });
            message.success('기존 고객 정보와 병합되었습니다.');
            setCustomerModalVisible(false);
            form.resetFields();
            return;
          } else {
            // 취소
            return;
          }
        }
      }

      // 전화번호에서 하이픈 제거하여 저장
      const phoneCleaned = values.phone.replace(/-/g, '');
      
      const customerData = {
        storeId,
        name: values.name,
        phone: phoneCleaned,
        balance: values.balance || 0,
      };

      if (selectedCustomer) {
        await updateDocument('prepayCustomers', selectedCustomer.id, customerData);
        message.success('고객 정보가 수정되었습니다.');
      } else {
        const customerId = await createDocument('prepayCustomers', customerData);
        
        // 신규 선결제 등록 시 거래 내역에도 추가
        if (values.balance && values.balance > 0) {
          await createDocument('prepayTransactions', {
            storeId,
            prepayCustomerId: customerId,
            type: 'charge',
            amount: values.balance,
            balance: values.balance,
            staffId: account?.uid || account?.id,
            staffName: account?.name || account?.username || '알 수 없음',
            receiptNumber: '신규 등록',
            notes: '신규 선결제 등록',
          });
        }
        
        message.success('고객이 등록되었습니다.');
      }

      setCustomerModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('고객 정보 저장 오류:', error);
      message.error(`고객 정보 저장에 실패했습니다: ${error.message || error.code || '알 수 없는 오류'}`);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      await deleteDocument('prepayCustomers', customerId);
      message.success('고객이 삭제되었습니다.');
    } catch (error) {
      message.error('고객 삭제에 실패했습니다.');
    }
  };

  const handleCharge = (customer) => {
    setSelectedCustomer(customer);
    transactionForm.resetFields();
    transactionForm.setFieldsValue({ type: 'charge' });
    setTransactionModalVisible(true);
  };

  const handleDeduct = (customer) => {
    setSelectedCustomer(customer);
    transactionForm.resetFields();
    transactionForm.setFieldsValue({ type: 'deduct' });
    setTransactionModalVisible(true);
  };

  const handleTransactionSubmit = async (values) => {
    if (!selectedCustomer) return;

    try {
      const amount = values.amount;
      const type = values.type;
      
      // 권한 확인
      if (type === 'charge' && !permissions.canChargePrepay) {
        message.error('충전 권한이 없습니다.');
        return;
      }
      if (type === 'deduct' && !permissions.canDeductPrepay) {
        message.error('차감 권한이 없습니다.');
        return;
      }

      // 잔액 계산
      const currentBalance = selectedCustomer.balance || 0;
      const newBalance = type === 'charge' 
        ? currentBalance + amount 
        : currentBalance - amount;

      if (newBalance < 0) {
        message.error('잔액이 부족합니다.');
        return;
      }

      // 거래 내역 생성
      const transactionData = {
        storeId,
        prepayCustomerId: selectedCustomer.id,
        type,
        amount,
        balance: newBalance,
        staffId: account?.uid || account?.id,
        staffName: account?.name || account?.username || '알 수 없음',
        receiptNumber: values.receiptNumber || '',
        ...(values.notes && { notes: values.notes }), // notes가 있을 때만 추가
      };

      await createDocument('prepayTransactions', transactionData);

      // 고객 잔액 업데이트
      await updateDocument('prepayCustomers', selectedCustomer.id, {
        balance: newBalance,
      });

      message.success(type === 'charge' ? '충전이 완료되었습니다.' : '차감이 완료되었습니다.');
      setTransactionModalVisible(false);
      transactionForm.resetFields();
    } catch (error) {
      console.error('거래 처리 오류:', error);
      message.error(`거래 처리에 실패했습니다: ${error.message || error.code || '알 수 없는 오류'}`);
    }
  };

  const handleViewHistory = async (customer) => {
    setSelectedCustomer(customer);
    // 고객별 거래 내역 필터링
    const filtered = transactions.filter(t => t.prepayCustomerId === customer.id);
    setTransactions(filtered);
    setHistoryModalVisible(true);
  };

  const customerColumns = [
    {
      title: '고객명',
      dataIndex: 'name',
      key: 'name',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="고객명 검색"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              검색
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              초기화
            </Button>
          </div>
        </div>
      ),
      onFilter: (value, record) =>
        record.name?.toLowerCase().includes(value.toLowerCase()),
      render: (text, record) => (
        <a
          onClick={() => handleViewHistory(record)}
          style={{ cursor: 'pointer', color: '#1890ff' }}
        >
          {text}
        </a>
      ),
    },
    {
      title: '연락처',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => {
        if (!phone) return '-';
        // 000-0000-0000 형식으로 변환
        const cleaned = phone.replace(/-/g, '');
        if (cleaned.length === 11) {
          return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
        } else if (cleaned.length === 10) {
          return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="전화번호 검색"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              검색
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              초기화
            </Button>
          </div>
        </div>
      ),
      onFilter: (value, record) =>
        record.phone?.includes(value),
      render: (text, record) => (
        <a
          onClick={() => handleViewHistory(record)}
          style={{ cursor: 'pointer', color: '#1890ff' }}
        >
          {text}
        </a>
      ),
    },
    {
      title: '잔액',
      dataIndex: 'balance',
      key: 'balance',
      render: (balance) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {balance?.toLocaleString() || 0}원
        </span>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      render: (_, record) => (
        <div>
          {(permissions.canManageStore || permissions.isStaff) && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditCustomer(record)}
            >
              수정
            </Button>
          )}
          {permissions.canChargePrepay && (
            <Button
              type="link"
              size="small"
              onClick={() => handleCharge(record)}
            >
              충전
            </Button>
          )}
          {permissions.canDeductPrepay && (
            <Button
              type="link"
              size="small"
              onClick={() => handleDeduct(record)}
            >
              차감
            </Button>
          )}
          {permissions.canManageStore && (
            <Popconfirm
              title="고객 삭제"
              description="정말 이 고객을 삭제하시겠습니까? 관련 거래 내역도 함께 삭제됩니다."
              onConfirm={() => handleDeleteCustomer(record.id)}
              okText="삭제"
              cancelText="취소"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                삭제
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  const transactionColumns = [
    {
      title: '일시',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time) => {
        if (time?.toDate) {
          return new Date(time.toDate()).toLocaleString('ko-KR');
        }
        return '-';
      },
    },
    {
      title: '고객',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <span style={{ color: type === 'charge' ? '#52c41a' : '#ff9800', fontWeight: 'bold' }}>
          {type === 'charge' ? '충전' : '차감'}
        </span>
      ),
    },
    {
      title: '금액',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `${amount?.toLocaleString() || 0}원`,
    },
    {
      title: '잔액',
      dataIndex: 'balance',
      key: 'balance',
      render: (balance) => `${balance?.toLocaleString() || 0}원`,
    },
    {
      title: '영수증 번호',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      render: (receiptNumber) => receiptNumber || '-',
    },
    {
      title: '처리자',
      dataIndex: 'staffName',
      key: 'staffName',
    },
    {
      title: '메모',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes) => notes || '-',
    },
  ];

  // 기능 비활성화 확인
  if (isFeatureDisabled('prepay')) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#999' }}>
            선결제 관리 기능이 비활성화되었습니다.
          </p>
          {disabledFeatures.reason && (
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              사유: {disabledFeatures.reason}
            </p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card 
        title="선결제 관리"
        extra={
          (permissions.canManageStore || permissions.isStaff) && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateCustomer}
            >
              고객 등록
            </Button>
          )
        }
      >
        <Table
          dataSource={customers}
          columns={customerColumns}
          loading={loading}
          rowKey="id"
        />
      </Card>

      <Modal
        title={selectedCustomer ? '고객 정보 수정' : '고객 등록'}
        open={customerModalVisible}
        onCancel={() => {
          setCustomerModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleCustomerSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="고객명"
            rules={[{ required: true, message: '고객명을 입력해주세요.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="연락처"
            rules={[
              { required: true, message: '연락처를 입력해주세요.' },
              { pattern: /^[0-9-]+$/, message: '숫자와 하이픈(-)만 입력 가능합니다.' },
            ]}
            normalize={(value) => {
              if (!value) return value;
              // 숫자만 추출
              const cleaned = value.replace(/[^0-9]/g, '');
              // 000-0000-0000 형식으로 변환
              if (cleaned.length <= 3) {
                return cleaned;
              } else if (cleaned.length <= 7) {
                return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
              } else if (cleaned.length <= 11) {
                return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
              }
              return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
            }}
          >
            <Input placeholder="010-0000-0000" maxLength={13} />
          </Form.Item>
          <Form.Item
            name="balance"
            label="초기 잔액"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={transactionForm.getFieldValue('type') === 'charge' ? '충전' : '차감'}
        open={transactionModalVisible}
        onCancel={() => {
          setTransactionModalVisible(false);
          transactionForm.resetFields();
        }}
        onOk={() => transactionForm.submit()}
      >
        <Form form={transactionForm} onFinish={handleTransactionSubmit} layout="vertical">
          <Form.Item label="고객">
            <Input value={selectedCustomer?.name} disabled />
          </Form.Item>
          <Form.Item label="현재 잔액">
            <Input value={`${(selectedCustomer?.balance || 0).toLocaleString()}원`} disabled />
          </Form.Item>
          <Form.Item
            name="type"
            hidden
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="amount"
            label="금액"
            rules={[{ required: true, message: '금액을 입력해주세요.' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="receiptNumber"
            label="영수증 번호"
            rules={[{ required: true, message: '영수증 번호를 입력해주세요.' }]}
          >
            <Input placeholder="영수증 번호를 입력하세요" />
          </Form.Item>
          <Form.Item name="notes" label="메모">
            <Input.TextArea rows={3} />
          </Form.Item>
          </Form>
        </Modal>

      <Modal
        title={`${selectedCustomer?.name || '고객'} 거래 내역`}
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setSelectedCustomer(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setHistoryModalVisible(false);
            setSelectedCustomer(null);
          }}>
            닫기
          </Button>
        ]}
        width={800}
      >
        <Table
          dataSource={transactions}
          columns={transactionColumns}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  );
}

