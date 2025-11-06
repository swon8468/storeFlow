import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, DatePicker, Tag, message, Popconfirm, Select } from 'antd';
import { FileTextOutlined, EditOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSession } from '../../hooks/useSession';
import { usePermissions } from '../../hooks/usePermissions';
import { getCollection, createDocument, updateDocument, deleteDocument } from '../../services/firestoreService';
import { Timestamp } from 'firebase/firestore';

export function Contracts() {
  const { storeId, account } = useSession();
  const permissions = usePermissions();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [form] = Form.useForm();
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    if (storeId) {
      loadContracts();
      loadStaffList();
    }
  }, [storeId]);

  const loadStaffList = async () => {
    if (!storeId) return;
    
    try {
      const staffAccounts = await getCollection('accounts', {
        filters: [
          { field: 'storeId', operator: '==', value: storeId },
          { field: 'role', operator: '==', value: 'staff' },
        ],
      });
      setStaffList(staffAccounts);
    } catch (error) {
      console.error('사원 목록 조회 오류:', error);
    }
  };

  const loadContracts = async () => {
    if (!storeId) return;
    
    setLoading(true);
    try {
      const data = await getCollection('contracts', {
        filters: [{ field: 'storeId', operator: '==', value: storeId }],
        orderByField: 'createdAt',
        orderByDirection: 'desc',
      });
      setContracts(data);
    } catch (error) {
      message.error('근로계약서 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingContract(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingContract(record);
    form.setFieldsValue({
      staffName: record.staffName,
      staffId: record.staffId,
      position: record.position,
      startDate: record.startDate ? dayjs(record.startDate.toDate()) : null,
      endDate: record.endDate ? dayjs(record.endDate.toDate()) : null,
      hourlyWage: record.hourlyWage,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const contractData = {
        storeId,
        staffName: values.staffName,
        staffId: values.staffId,
        position: values.position,
        startDate: Timestamp.fromDate(values.startDate.toDate()),
        endDate: values.endDate ? Timestamp.fromDate(values.endDate.toDate()) : null,
        hourlyWage: values.hourlyWage,
        status: values.status || 'pending',
        staffSignature: null,
        adminSignature: null,
        signedAt: null,
      };

      if (editingContract) {
        await updateDocument('contracts', editingContract.id, contractData);
        message.success('근로계약서가 수정되었습니다.');
      } else {
        await createDocument('contracts', contractData);
        message.success('근로계약서가 생성되었습니다.');
      }

      setModalVisible(false);
      form.resetFields();
      loadContracts();
    } catch (error) {
      message.error('근로계약서 저장에 실패했습니다.');
    }
  };

  const handleSign = async (contract) => {
    if (!permissions.canSignContract) {
      message.error('서명 권한이 없습니다.');
      return;
    }

    Modal.confirm({
      title: '근로계약서에 서명하시겠습니까?',
      content: '서명 후에는 수정할 수 없습니다.',
      onOk: async () => {
        try {
          await updateDocument('contracts', contract.id, {
            adminSignature: {
              name: account?.name || account?.username,
              uid: account?.uid,
              signedAt: Timestamp.now(),
              ip: 'IP주소는 서버에서 기록됩니다.',
            },
            status: 'signed',
            signedAt: Timestamp.now(),
          });
          message.success('서명이 완료되었습니다.');
          loadContracts();
        } catch (error) {
          message.error('서명 처리에 실패했습니다.');
        }
      },
    });
  };

  const handleDelete = async (contractId) => {
    try {
      await deleteDocument('contracts', contractId);
      message.success('근로계약서가 삭제되었습니다.');
      loadContracts();
    } catch (error) {
      message.error('근로계약서 삭제에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '사원명',
      dataIndex: 'staffName',
      key: 'staffName',
    },
    {
      title: '직급',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: '시작일',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => {
        if (date?.toDate) {
          return dayjs(date.toDate()).format('YYYY-MM-DD');
        }
        return '-';
      },
    },
    {
      title: '종료일',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => {
        if (date?.toDate) {
          return dayjs(date.toDate()).format('YYYY-MM-DD');
        }
        return '-';
      },
    },
    {
      title: '시급',
      dataIndex: 'hourlyWage',
      key: 'hourlyWage',
      render: (wage) => `${wage?.toLocaleString() || 0}원`,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          pending: 'orange',
          signed: 'green',
          expired: 'red',
        };
        const labels = {
          pending: '대기',
          signed: '서명완료',
          expired: '만료',
        };
        return <Tag color={colors[status]}>{labels[status] || status}</Tag>;
      },
    },
    {
      title: '작업',
      key: 'actions',
      render: (_, record) => (
        <div>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={record.status === 'signed'}
          >
            수정
          </Button>
          {permissions.canSignContract && record.status === 'pending' && (
            <Button
              type="link"
              onClick={() => handleSign(record)}
            >
              서명
            </Button>
          )}
          {permissions.canManageStaff && record.status !== 'signed' && (
            <Popconfirm
              title="근로계약서 삭제"
              description="정말 이 근로계약서를 삭제하시겠습니까?"
              onConfirm={() => handleDelete(record.id)}
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
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="근로계약서 관리"
        extra={
          permissions.canManageStaff && (
            <Button type="primary" onClick={handleCreate}>
              계약서 생성
            </Button>
          )
        }
      >
        <Table
          dataSource={contracts}
          columns={columns}
          loading={loading}
          rowKey="id"
        />
      </Card>

      <Modal
        title={editingContract ? '근로계약서 수정' : '근로계약서 생성'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="staffId"
            label="사원"
            rules={[{ required: true, message: '사원을 선택해주세요.' }]}
          >
            <Select 
              placeholder="사원을 선택하세요"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={(value) => {
                const selectedStaff = staffList.find(s => s.id === value);
                if (selectedStaff) {
                  form.setFieldsValue({
                    staffId: selectedStaff.id,
                    staffName: selectedStaff.name || selectedStaff.username,
                  });
                }
              }}
            >
              {staffList.map((staff) => (
                <Select.Option key={staff.id} value={staff.id} label={staff.name || staff.username}>
                  {staff.name || staff.username}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="staffName" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="position"
            label="직급"
            rules={[{ required: true, message: '직급을 입력해주세요.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="startDate"
            label="시작일"
            rules={[{ required: true, message: '시작일을 선택해주세요.' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endDate" label="종료일">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="hourlyWage"
            label="시급"
            rules={[{ required: true, message: '시급을 입력해주세요.' }]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item name="status" label="상태" initialValue="pending">
            <Input disabled />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

