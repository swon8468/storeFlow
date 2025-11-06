import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, DatePicker, TimePicker, Tag, message, Select, Input, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, CheckOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSession } from '../../hooks/useSession';
import { usePermissions } from '../../hooks/usePermissions';
import { getCollection, createDocument, updateDocument, deleteDocument } from '../../services/firestoreService';
import { Timestamp } from 'firebase/firestore';

const { Option } = Select;

export function Timesheets() {
  const { storeId, account } = useSession();
  const permissions = usePermissions();
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [form] = Form.useForm();
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    if (storeId) {
      loadTimesheets();
      loadStaffList();
    }
  }, [storeId, selectedMonth]);

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

  const loadTimesheets = async () => {
    if (!storeId) return;
    
    setLoading(true);
    try {
      const monthStart = selectedMonth.startOf('month').toDate();
      const monthEnd = selectedMonth.endOf('month').toDate();
      
      const data = await getCollection('timesheets', {
        filters: [
          { field: 'storeId', operator: '==', value: storeId },
          { field: 'date', operator: '>=', value: Timestamp.fromDate(monthStart) },
          { field: 'date', operator: '<=', value: Timestamp.fromDate(monthEnd) },
        ],
        orderByField: 'date',
        orderByDirection: 'desc',
      });
      setTimesheets(data);
    } catch (error) {
      message.error('근무시간 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTimesheet(null);
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(),
      staffId: permissions.isStaff ? account?.uid : undefined,
      staffName: permissions.isStaff ? (account?.name || account?.username) : undefined,
    });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingTimesheet(record);
    form.setFieldsValue({
      date: record.date ? dayjs(record.date.toDate()) : dayjs(),
      staffId: record.staffId,
      staffName: record.staffName,
      clockIn: record.clockIn ? dayjs(record.clockIn.toDate()) : null,
      clockOut: record.clockOut ? dayjs(record.clockOut.toDate()) : null,
      breakDuration: record.breakDuration || 0,
      overtime: record.overtime || 0,
      status: record.status || 'pending',
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const date = values.date.toDate();
      date.setHours(0, 0, 0, 0);

      const timesheetData = {
        storeId,
        date: Timestamp.fromDate(date),
        staffId: values.staffId,
        staffName: values.staffName,
        clockIn: values.clockIn ? Timestamp.fromDate(values.clockIn.toDate()) : null,
        clockOut: values.clockOut ? Timestamp.fromDate(values.clockOut.toDate()) : null,
        breakDuration: values.breakDuration || 0,
        overtime: values.overtime || 0,
        status: values.status || 'pending',
        approvedBy: null,
        approvedAt: null,
      };

      if (editingTimesheet) {
        await updateDocument('timesheets', editingTimesheet.id, timesheetData);
        message.success('근무시간이 수정되었습니다.');
      } else {
        await createDocument('timesheets', timesheetData);
        message.success('근무시간이 등록되었습니다.');
      }

      setModalVisible(false);
      form.resetFields();
      loadTimesheets();
    } catch (error) {
      message.error('근무시간 저장에 실패했습니다.');
    }
  };

  const handleApprove = async (timesheet, approved) => {
    if (!permissions.canApproveHR) {
      message.error('승인 권한이 없습니다.');
      return;
    }

    try {
      await updateDocument('timesheets', timesheet.id, {
        status: approved ? 'approved' : 'rejected',
        approvedBy: account?.uid,
        approvedAt: Timestamp.now(),
      });
      message.success(approved ? '승인되었습니다.' : '반려되었습니다.');
      loadTimesheets();
    } catch (error) {
      message.error('처리에 실패했습니다.');
    }
  };

  const handleDelete = async (timesheetId) => {
    try {
      await deleteDocument('timesheets', timesheetId);
      message.success('근무시간 기록이 삭제되었습니다.');
      loadTimesheets();
    } catch (error) {
      message.error('근무시간 삭제에 실패했습니다.');
    }
  };

  const calculateHours = (clockIn, clockOut, breakDuration) => {
    if (!clockIn || !clockOut) return 0;
    const start = clockIn.toDate ? clockIn.toDate() : new Date(clockIn);
    const end = clockOut.toDate ? clockOut.toDate() : new Date(clockOut);
    const diff = (end - start) / (1000 * 60 * 60); // 시간 단위
    return Math.max(0, diff - (breakDuration || 0));
  };

  const columns = [
    {
      title: '날짜',
      dataIndex: 'date',
      key: 'date',
      render: (date) => {
        if (date?.toDate) {
          return dayjs(date.toDate()).format('YYYY-MM-DD');
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
      title: '출근',
      dataIndex: 'clockIn',
      key: 'clockIn',
      render: (time) => {
        if (time?.toDate) {
          return dayjs(time.toDate()).format('HH:mm');
        }
        return '-';
      },
    },
    {
      title: '퇴근',
      dataIndex: 'clockOut',
      key: 'clockOut',
      render: (time) => {
        if (time?.toDate) {
          return dayjs(time.toDate()).format('HH:mm');
        }
        return '-';
      },
    },
    {
      title: '휴게시간',
      dataIndex: 'breakDuration',
      key: 'breakDuration',
      render: (duration) => `${duration || 0}시간`,
    },
    {
      title: '근무시간',
      key: 'workHours',
      render: (_, record) => {
        const hours = calculateHours(record.clockIn, record.clockOut, record.breakDuration);
        return `${hours.toFixed(1)}시간`;
      },
    },
    {
      title: '연장근무',
      dataIndex: 'overtime',
      key: 'overtime',
      render: (overtime) => `${overtime || 0}시간`,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          pending: 'orange',
          approved: 'green',
          rejected: 'red',
        };
        const labels = {
          pending: '대기',
          approved: '승인',
          rejected: '반려',
        };
        return <Tag color={colors[status]}>{labels[status] || status}</Tag>;
      },
    },
    {
      title: '작업',
      key: 'actions',
      render: (_, record) => (
        <div>
          {(permissions.isStaff || permissions.isStoreAdmin) && record.status === 'pending' && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              수정
            </Button>
          )}
          {permissions.canApproveHR && record.status === 'pending' && (
            <>
              <Button
                type="link"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record, true)}
              >
                승인
              </Button>
              <Button
                type="link"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleApprove(record, false)}
              >
                반려
              </Button>
            </>
          )}
          {permissions.canManageStaff && (
            <Popconfirm
              title="근무시간 삭제"
              description="정말 이 근무시간 기록을 삭제하시겠습니까?"
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
        title="근무시간 관리"
        extra={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={setSelectedMonth}
              style={{ marginRight: '8px' }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              등록
            </Button>
          </div>
        }
      >
        <Table
          dataSource={timesheets}
          columns={columns}
          loading={loading}
          rowKey="id"
        />
      </Card>

      <Modal
        title={editingTimesheet ? '근무시간 수정' : '근무시간 등록'}
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
            name="date"
            label="날짜"
            rules={[{ required: true, message: '날짜를 선택해주세요.' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
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
              disabled={!permissions.canManageStaff}
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
                <Option key={staff.id} value={staff.id} label={staff.name || staff.username}>
                  {staff.name || staff.username}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="staffName" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="clockIn" label="출근시간">
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="clockOut" label="퇴근시간">
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="breakDuration" label="휴게시간 (시간)">
            <Input type="number" step="0.5" min={0} />
          </Form.Item>
          <Form.Item name="overtime" label="연장근무 (시간)">
            <Input type="number" step="0.5" min={0} />
          </Form.Item>
          <Form.Item name="status" label="상태" initialValue="pending">
            <Select disabled={!permissions.canApproveHR}>
              <Option value="pending">대기</Option>
              <Option value="approved">승인</Option>
              <Option value="rejected">반려</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

