import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, Tag, message, Tabs, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { DollarOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSession } from '../../hooks/useSession';
import { usePermissions } from '../../hooks/usePermissions';
import { getCollection, createDocument, updateDocument, deleteDocument } from '../../services/firestoreService';
import { Timestamp } from 'firebase/firestore';

const { Option } = Select;
const { TabPane } = Tabs;

export function Payroll() {
  const { storeId, isFeatureDisabled, disabledFeatures } = useSession();
  const permissions = usePermissions();
  const [rules, setRules] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [payrollModalVisible, setPayrollModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm] = Form.useForm();
  const [payrollForm] = Form.useForm();
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    if (storeId) {
      loadRules();
      loadPayrolls();
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

  const loadRules = async () => {
    if (!storeId) return;
    
    setLoading(true);
    try {
      const data = await getCollection('payrollRules', {
        filters: [{ field: 'storeId', operator: '==', value: storeId }],
        orderByField: 'createdAt',
        orderByDirection: 'desc',
      });
      setRules(data);
    } catch (error) {
      message.error('급여 규칙을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadPayrolls = async () => {
    if (!storeId) return;
    
    try {
      const data = await getCollection('payrolls', {
        filters: [{ field: 'storeId', operator: '==', value: storeId }],
        orderByField: 'createdAt',
        orderByDirection: 'desc',
      });
      setPayrolls(data);
    } catch (error) {
      message.error('급여 명세를 불러오는데 실패했습니다.');
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    ruleForm.resetFields();
    setRuleModalVisible(true);
  };

  const handleEditRule = (record) => {
    setEditingRule(record);
    ruleForm.setFieldsValue({
      name: record.name,
      baseHourlyWage: record.baseHourlyWage,
      overtimeMultiplier: record.overtimeMultiplier || 1.5,
      taxRate: record.taxRate || 0,
      allowance: record.allowance || 0,
    });
    setRuleModalVisible(true);
  };

  const handleRuleSubmit = async (values) => {
    try {
      const ruleData = {
        storeId,
        name: values.name,
        baseHourlyWage: values.baseHourlyWage,
        overtimeMultiplier: values.overtimeMultiplier || 1.5,
        taxRate: values.taxRate || 0,
        allowance: values.allowance || 0,
      };

      if (editingRule) {
        await updateDocument('payrollRules', editingRule.id, ruleData);
        message.success('급여 규칙이 수정되었습니다.');
      } else {
        await createDocument('payrollRules', ruleData);
        message.success('급여 규칙이 생성되었습니다.');
      }

      setRuleModalVisible(false);
      ruleForm.resetFields();
      loadRules();
    } catch (error) {
      message.error('급여 규칙 저장에 실패했습니다.');
    }
  };

  const handleCreatePayroll = () => {
    payrollForm.resetFields();
    setPayrollModalVisible(true);
  };

  const handlePayrollSubmit = async (values) => {
    try {
      // 여기서 실제 급여 계산 로직을 구현해야 합니다
      // 간단한 예시로만 구현
      const payrollData = {
        storeId,
        staffId: values.staffId,
        staffName: values.staffName,
        period: Timestamp.fromDate(values.period.toDate()),
        baseHours: values.baseHours || 0,
        overtimeHours: values.overtimeHours || 0,
        baseWage: values.baseWage || 0,
        overtimeWage: values.overtimeWage || 0,
        allowance: values.allowance || 0,
        tax: values.tax || 0,
        total: values.total || 0,
        status: 'pending',
      };

      await createDocument('payrolls', payrollData);
      message.success('급여 명세가 생성되었습니다.');
      setPayrollModalVisible(false);
      payrollForm.resetFields();
      loadPayrolls();
    } catch (error) {
      message.error('급여 명세 생성에 실패했습니다.');
    }
  };

  const ruleColumns = [
    {
      title: '규칙명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '기본 시급',
      dataIndex: 'baseHourlyWage',
      key: 'baseHourlyWage',
      render: (wage) => `${wage?.toLocaleString() || 0}원`,
    },
    {
      title: '연장근무 배수',
      dataIndex: 'overtimeMultiplier',
      key: 'overtimeMultiplier',
      render: (mult) => `${mult || 1.5}배`,
    },
    {
      title: '세율',
      dataIndex: 'taxRate',
      key: 'taxRate',
      render: (rate) => `${(rate * 100) || 0}%`,
    },
    {
      title: '수당',
      dataIndex: 'allowance',
      key: 'allowance',
      render: (allowance) => `${allowance?.toLocaleString() || 0}원`,
    },
    {
      title: '작업',
      key: 'actions',
      render: (_, record) => (
        <div>
          <Button
            type="link"
            onClick={() => handleEditRule(record)}
          >
            수정
          </Button>
          {permissions.canManageStore && (
            <Popconfirm
              title="급여 규칙 삭제"
              description="정말 이 급여 규칙을 삭제하시겠습니까?"
              onConfirm={async () => {
                try {
                  await deleteDocument('payrollRules', record.id);
                  message.success('급여 규칙이 삭제되었습니다.');
                  loadRules();
                } catch (error) {
                  message.error('급여 규칙 삭제에 실패했습니다.');
                }
              }}
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

  const payrollColumns = [
    {
      title: '기간',
      dataIndex: 'period',
      key: 'period',
      render: (period) => {
        if (period?.toDate) {
          return dayjs(period.toDate()).format('YYYY-MM');
        }
        return '-';
      },
    },
    {
      title: '사원명',
      dataIndex: 'staffName',
      key: 'staffName',
    },
    {
      title: '기본 근무시간',
      dataIndex: 'baseHours',
      key: 'baseHours',
      render: (hours) => `${hours || 0}시간`,
    },
    {
      title: '연장근무시간',
      dataIndex: 'overtimeHours',
      key: 'overtimeHours',
      render: (hours) => `${hours || 0}시간`,
    },
    {
      title: '총 급여',
      dataIndex: 'total',
      key: 'total',
      render: (total) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {total?.toLocaleString() || 0}원
        </span>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          pending: 'orange',
          approved: 'green',
          paid: 'blue',
        };
        const labels = {
          pending: '대기',
          approved: '승인',
          paid: '지급완료',
        };
        return <Tag color={colors[status]}>{labels[status] || status}</Tag>;
      },
    },
  ];

  // 기능 비활성화 확인
  if (isFeatureDisabled('payroll')) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#999' }}>
            급여 기능이 비활성화되었습니다.
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
      <Card title="급여 관리">
        <Tabs defaultActiveKey="rules">
          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                급여 규칙
              </span>
            }
            key="rules"
          >
            <div style={{ marginBottom: '16px' }}>
              <Button
                type="primary"
                onClick={handleCreateRule}
                disabled={!permissions.canManageStore}
              >
                규칙 생성
              </Button>
            </div>
            <Table
              dataSource={rules}
              columns={ruleColumns}
              loading={loading}
              rowKey="id"
            />
          </TabPane>
          <TabPane
            tab={
              <span>
                <DollarOutlined />
                급여 명세
              </span>
            }
            key="payrolls"
          >
            <div style={{ marginBottom: '16px' }}>
              <Button
                type="primary"
                onClick={handleCreatePayroll}
                disabled={!permissions.canManageStore}
              >
                명세 생성
              </Button>
            </div>
            <Table
              dataSource={payrolls}
              columns={payrollColumns}
              loading={loading}
              rowKey="id"
            />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title={editingRule ? '급여 규칙 수정' : '급여 규칙 생성'}
        open={ruleModalVisible}
        onCancel={() => {
          setRuleModalVisible(false);
          ruleForm.resetFields();
        }}
        onOk={() => ruleForm.submit()}
      >
        <Form form={ruleForm} onFinish={handleRuleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="규칙명"
            rules={[{ required: true, message: '규칙명을 입력해주세요.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="baseHourlyWage"
            label="기본 시급"
            rules={[{ required: true, message: '기본 시급을 입력해주세요.' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="overtimeMultiplier"
            label="연장근무 배수"
            initialValue={1.5}
          >
            <InputNumber min={1} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="taxRate"
            label="세율 (0~1)"
            initialValue={0}
          >
            <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="allowance"
            label="수당"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="급여 명세 생성"
        open={payrollModalVisible}
        onCancel={() => {
          setPayrollModalVisible(false);
          payrollForm.resetFields();
        }}
        onOk={() => payrollForm.submit()}
        width={600}
      >
        <Form form={payrollForm} onFinish={handlePayrollSubmit} layout="vertical">
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
                  payrollForm.setFieldsValue({
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
            name="period"
            label="급여 기간"
            rules={[{ required: true, message: '급여 기간을 선택해주세요.' }]}
          >
            <DatePicker picker="month" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="baseHours" label="기본 근무시간">
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="overtimeHours" label="연장근무시간">
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="baseWage" label="기본 급여">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="overtimeWage" label="연장근무 급여">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="allowance" label="수당">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="tax" label="세금">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="total" label="총 급여">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

