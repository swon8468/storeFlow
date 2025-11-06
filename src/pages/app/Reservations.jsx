import { useState, useEffect, useRef } from 'react';
import { Calendar, Card, Button, Select, Table, Tag, Modal, Form, Input, InputNumber, DatePicker, message, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { useSession } from '../../hooks/useSession';
import { usePermissions } from '../../hooks/usePermissions';
import { getReservationsByDate, createDocument, updateDocument, deleteDocument, subscribeCollection } from '../../services/firestoreService';
import { Timestamp } from 'firebase/firestore';

const { Option } = Select;

export function Reservations() {
  const { storeId, account, loading: sessionLoading, isFeatureDisabled, disabledFeatures } = useSession();
  const permissions = usePermissions();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [form] = Form.useForm();
  const [staffList, setStaffList] = useState([]);
  const [selectedHour, setSelectedHour] = useState(null);
  const [selectedMinute, setSelectedMinute] = useState(null);
  const [allReservations, setAllReservations] = useState([]); // 달력 표시용 전체 예약
  const [allCustomerReservations, setAllCustomerReservations] = useState([]); // 고객별 통계용 전체 예약
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedReservationForStatus, setSelectedReservationForStatus] = useState(null);
  const unsubscribeRefs = useRef([]);

  useEffect(() => {
    if (storeId) {
      loadStaffList();
      setupRealtimeSubscriptions();
    } else {
      console.warn('storeId is not available:', storeId);
    }

    // cleanup 함수
    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
      unsubscribeRefs.current = [];
    };
  }, [storeId, selectedDate]);

  const loadStaffList = async () => {
    if (!storeId) return;
    
    try {
      const { getCollection } = await import('../../services/firestoreService');
      // 인덱스 없이 작동하도록 storeId로만 필터링하고 클라이언트에서 필터링
      const allAccounts = await getCollection('accounts', {
        filters: [
          { field: 'storeId', operator: '==', value: storeId },
        ],
      });
      
      // 클라이언트 측에서 role 필터링
      const staffAccounts = allAccounts.filter(account => account.role === 'staff');
      setStaffList(staffAccounts);
    } catch (error) {
      console.error('사원 목록 조회 오류:', error);
      console.error('오류 상세:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
    }
  };


  const enrichReservationData = async (reservations) => {
    const { getDocument } = await import('../../services/firestoreService');
    return await Promise.all(
      reservations.map(async (reservation) => {
        let staffName = reservation.staffName || '-';
        let createdByName = reservation.createdByName || '-';
        
        // 담당자 정보 조회
        if (reservation.staffId) {
          try {
            const staffAccount = await getDocument('accounts', reservation.staffId);
            if (staffAccount) {
              staffName = staffAccount.name || staffAccount.username || '-';
            }
          } catch (error) {
            console.error('사원 정보 조회 오류:', error);
          }
        }
        
        // 생성자 정보 조회 (createdBy가 uid인 경우)
        if (reservation.createdBy && !reservation.createdByName) {
          try {
            const creatorAccount = await getDocument('accounts', reservation.createdBy);
            if (creatorAccount) {
              createdByName = creatorAccount.name || creatorAccount.username || '-';
            }
          } catch (error) {
            console.error('생성자 정보 조회 오류:', error);
          }
        }
        
        return {
          ...reservation,
          staffName,
          createdByName,
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

    // 선택된 날짜의 예약 실시간 구독
    const dateStr = selectedDate.format('YYYY-MM-DD');
    
    const unsubscribe1 = subscribeCollection(
      'reservations',
      {
        filters: [
          { field: 'storeId', operator: '==', value: storeId },
        ],
      },
      async (data, error) => {
        if (error) {
          console.error('예약 실시간 구독 오류:', error);
          setLoading(false);
          return;
        }
        
        // 날짜 필터링 (클라이언트 측)
        const filteredData = data.filter(r => {
          if (!r.date) return false;
          const reservationDate = r.date.toDate ? dayjs(r.date.toDate()) : dayjs(r.date);
          return reservationDate.format('YYYY-MM-DD') === dateStr;
        });
        
        // 방문 안한 예약 먼저, 그 다음 시간 빠른 순서로 정렬
        filteredData.sort((a, b) => {
          const aStatus = a.status || 'pending';
          const bStatus = b.status || 'pending';
          const aIsPending = aStatus === 'pending';
          const bIsPending = bStatus === 'pending';
          
          // 방문 안한 예약(pending)을 먼저
          if (aIsPending && !bIsPending) return -1;
          if (!aIsPending && bIsPending) return 1;
          
          // 같은 상태면 시간 빠른 순서
          const aTime = a.startTime?.toDate ? a.startTime.toDate().getTime() : (a.startTime?.seconds || 0) * 1000;
          const bTime = b.startTime?.toDate ? b.startTime.toDate().getTime() : (b.startTime?.seconds || 0) * 1000;
          return aTime - bTime;
        });
        
        const enrichedData = await enrichReservationData(filteredData);
        setReservations(enrichedData);
        setLoading(false);
      }
    );
    unsubscribeRefs.current.push(unsubscribe1);

    // 달력용 전체 예약 구독
    const currentMonth = selectedDate.month();
    const currentYear = selectedDate.year();
    const startDate = dayjs(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`).startOf('month');
    const endDate = startDate.endOf('month');
    
    const unsubscribe2 = subscribeCollection(
      'reservations',
      {
        filters: [
          { field: 'storeId', operator: '==', value: storeId },
        ],
      },
      (data, error) => {
        if (error) {
          console.error('달력용 예약 실시간 구독 오류:', error);
          return;
        }
        
        const monthReservations = data.filter(reservation => {
          if (!reservation.date) return false;
          const reservationDate = reservation.date.toDate ? dayjs(reservation.date.toDate()) : dayjs(reservation.date);
          const reservationDateStr = reservationDate.format('YYYY-MM-DD');
          const startDateStr = startDate.format('YYYY-MM-DD');
          const endDateStr = endDate.format('YYYY-MM-DD');
          return reservationDateStr >= startDateStr && reservationDateStr <= endDateStr;
        });
        
        setAllReservations(monthReservations);
      }
    );
    unsubscribeRefs.current.push(unsubscribe2);

    // 고객별 통계용 전체 예약 구독
    const unsubscribe3 = subscribeCollection(
      'reservations',
      {
        filters: [
          { field: 'storeId', operator: '==', value: storeId },
        ],
      },
      (data, error) => {
        if (error) {
          console.error('고객 통계용 예약 실시간 구독 오류:', error);
          return;
        }
        setAllCustomerReservations(data);
      }
    );
    unsubscribeRefs.current.push(unsubscribe3);
  };

  const handleCreate = () => {
    setEditingReservation(null);
    setSelectedHour(null);
    setSelectedMinute(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingReservation(record);
    let reservationHour = null;
    let reservationMinute = null;
    let reservationDate = null;
    if (record.startTime) {
      const time = dayjs(record.startTime.toDate());
      reservationHour = time.hour();
      reservationMinute = time.minute();
    }
    if (record.date) {
      reservationDate = dayjs(record.date.toDate ? record.date.toDate() : record.date);
    }
    setSelectedHour(reservationHour);
    setSelectedMinute(reservationMinute);
    form.setFieldsValue({
      customerName: record.customerName,
      phone: record.phone,
      source: record.source,
      reservationHour,
      reservationMinute,
      reservationDate: reservationDate || selectedDate,
      staffId: record.staffId,
      guestCount: record.guestCount || 1,
      notes: record.notes,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '예약을 삭제하시겠습니까?',
      onOk: async () => {
        try {
          // 삭제 전 예약 정보 확인 (storeId 검증)
          const { getDocument } = await import('../../services/firestoreService');
          const reservation = await getDocument('reservations', id);
          
          if (!reservation) {
            message.error('예약을 찾을 수 없습니다.');
            return;
          }
          
          // storeId 확인
          if (reservation.storeId !== storeId) {
            message.error('본인 매장의 예약만 삭제할 수 있습니다.');
            return;
          }
          
          await deleteDocument('reservations', id);
          message.success('예약이 삭제되었습니다.');
          loadReservations();
        } catch (error) {
          console.error('예약 삭제 오류:', error);
          console.error('오류 상세:', {
            code: error.code,
            message: error.message,
            stack: error.stack,
          });
          message.error(`예약 삭제에 실패했습니다: ${error.message || error.code || '알 수 없는 오류'}`);
        }
      },
    });
  };

  const handleSubmit = async (values) => {
    try {
      // 사원이 생성하는 경우 담당자 필드 제거하고 자동으로 "배정 중"
      const isStaff = account?.role === 'staff';
      
      // 예약 날짜 (수정 시 날짜 변경 가능)
      const reservationDateValue = values.reservationDate || selectedDate;
      const reservationDate = reservationDateValue.toDate();
      reservationDate.setHours(0, 0, 0, 0);
      
      // 예약 시간에서 시간과 분 추출
      const hours = values.reservationHour;
      const minutes = values.reservationMinute;
      
      // 시작 시간 설정 (선택된 날짜 기준)
      const startDateTime = reservationDateValue.toDate();
      startDateTime.setHours(hours, minutes, 0, 0);
      const startTime = Timestamp.fromDate(startDateTime);

      const reservationData = {
        storeId,
        date: Timestamp.fromDate(reservationDate),
        customerName: values.customerName,
        phone: values.phone,
        source: values.source,
        startTime: startTime,
        createdBy: account?.uid || account?.id,
        createdByName: account?.name || account?.username || '알 수 없음',
        staffId: isStaff ? null : (values.staffId || null),
        staffName: isStaff ? '배정 중' : (values.staffId ? (staffList.find(s => s.id === values.staffId)?.name || staffList.find(s => s.id === values.staffId)?.username || '알 수 없음') : '배정 중'),
        status: 'pending', // 기본 상태: 대기 중
        guestCount: values.guestCount || 1,
        ...(values.notes && { notes: values.notes }),
      };

      if (editingReservation) {
        // 수정 시에도 staffName 업데이트 (사원은 수정 불가)
        const isStaff = account?.role === 'staff';
        const updatedData = {
          ...reservationData,
          staffName: isStaff ? reservationData.staffName : (values.staffId ? (staffList.find(s => s.id === values.staffId)?.name || staffList.find(s => s.id === values.staffId)?.username || '알 수 없음') : '배정 중'),
        };
        // 사원이 수정할 때는 status를 유지
        if (isStaff && editingReservation.status) {
          updatedData.status = editingReservation.status;
        }
        await updateDocument('reservations', editingReservation.id, updatedData);
        message.success('예약이 수정되었습니다.');
      } else {
        await createDocument('reservations', reservationData);
        message.success('예약이 생성되었습니다.');
      }

      setModalVisible(false);
      setSelectedHour(null);
      setSelectedMinute(null);
      form.resetFields();
    } catch (error) {
      console.error('예약 저장 오류:', error);
      message.error(`예약 저장에 실패했습니다: ${error.message || error.code || '알 수 없는 오류'}`);
    }
  };

  const columns = [
    {
      title: '시간',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time) => {
        if (time?.toDate) {
          return dayjs(time.toDate()).format('HH:mm');
        }
        return '-';
      },
    },
    {
      title: '이름',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name, record) => {
        // 전화번호로 전체 예약 횟수와 이용 완료 횟수 계산
        const customerReservations = allCustomerReservations.filter(r => r.phone === record.phone);
        const totalCount = customerReservations.length;
        const completedCount = customerReservations.filter(r => r.status === 'completed').length;
        
        return (
          <div>
            <a
              onClick={() => {
                setSelectedReservationForStatus(record);
                setStatusModalVisible(true);
              }}
              style={{ cursor: 'pointer', color: '#1890ff' }}
            >
              {name}
            </a>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              예약 {totalCount}회 / 이용 완료 {completedCount}회
            </div>
          </div>
        );
      },
    },
    {
      title: '전화번호',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '인원수',
      dataIndex: 'guestCount',
      key: 'guestCount',
      render: (count) => count || 1,
    },
    {
      title: '예약 방법',
      dataIndex: 'source',
      key: 'source',
      render: (source) => (
        <Tag color={source === 'phone' ? 'blue' : 'green'}>
          {source === 'phone' ? '전화' : '네이버예약'}
        </Tag>
      ),
    },
    {
      title: '담당자',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (name) => name || '-',
    },
    {
      title: '생성자',
      dataIndex: 'createdByName',
      key: 'createdByName',
      render: (name) => name || '-',
    },
    {
      title: '상태/작업',
      key: 'statusActions',
      render: (_, record) => {
        const status = record.status;
        const statusMap = {
          completed: { label: '이용 완료', color: 'green' },
          cancelled: { label: '고객 요청 취소', color: 'orange' },
          noShow: { label: '노쇼', color: 'red' },
        };
        const statusInfo = status && status !== 'pending' ? statusMap[status] : null;
        const isStoreAdmin = permissions.isStoreAdmin;
        const canEdit = permissions.canEditReservations && (status === 'pending' || !status || isStoreAdmin);
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {statusInfo ? (
              <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
            ) : (
              <span style={{ color: '#999' }}>-</span>
            )}
            {canEdit && (
              <div>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                  disabled={status && status !== 'pending' && !isStoreAdmin}
                >
                  수정
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record.id)}
                  disabled={status && status !== 'pending' && !isStoreAdmin}
                >
                  삭제
                </Button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  if (sessionLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!storeId) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#999' }}>
            매장 정보를 불러올 수 없습니다. 계정에 매장이 연결되어 있는지 확인해주세요.
          </p>
          {account && (
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              계정 역할: {account.role}, 매장 ID: {account.storeId || '없음'}
            </p>
          )}
        </div>
      </Card>
    );
  }

  // 기능 비활성화 확인
  if (isFeatureDisabled('reservations')) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#999' }}>
            예약 관리 기능이 비활성화되었습니다.
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
        title="예약 관리"
        extra={
          permissions.canEditReservations && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              예약 추가
            </Button>
          )
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Button
              icon={<LeftOutlined />}
              onClick={() => {
                setSelectedDate(selectedDate.subtract(1, 'month'));
              }}
            >
              이전 달
            </Button>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {selectedDate.format('YYYY년 MM월')}
            </div>
            <Button
              icon={<RightOutlined />}
              onClick={() => {
                setSelectedDate(selectedDate.add(1, 'month'));
              }}
            >
              다음 달
            </Button>
          </div>
          <div style={{ position: 'relative' }}>
            <style>{`
              .ant-picker-calendar-date-content {
                display: none !important;
              }
              .ant-picker-cell-inner {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
            `}</style>
            <Calendar
              fullscreen={false}
              value={selectedDate}
              onChange={setSelectedDate}
              onSelect={setSelectedDate}
              cellRender={(date, info) => {
                if (info.type !== 'date') {
                  return info.originNode;
                }
                
                const dateStr = date.format('YYYY-MM-DD');
                const dayOfWeek = date.day(); // 0: 일요일, 6: 토요일
                const hasReservation = allReservations.some(r => {
                  if (!r.date) return false;
                  const reservationDate = r.date.toDate ? dayjs(r.date.toDate()) : dayjs(r.date);
                  return reservationDate.format('YYYY-MM-DD') === dateStr;
                });
                
                return (
                  <div 
                    style={{ 
                      position: 'relative', 
                      width: '100%', 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        color: dayOfWeek === 0 ? '#ff4d4f' : dayOfWeek === 6 ? '#1890ff' : undefined,
                        fontSize: '14px',
                        lineHeight: '1',
                      }}
                    >
                      {date.date()}
                    </span>
                    {hasReservation && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#52c41a',
                          display: 'inline-block',
                        }}
                      />
                    )}
                  </div>
                );
              }}
            />
          </div>
        </div>
        <Table
          dataSource={reservations}
          columns={columns}
          loading={loading}
          rowKey="id"
          pagination={false}
          locale={{
            emptyText: reservations.length === 0 && !loading ? '데이터 없음' : undefined,
          }}
        />
      </Card>

      <Modal
        title={editingReservation ? '예약 수정' : '예약 추가'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedHour(null);
          setSelectedMinute(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="customerName"
            label="이름"
            rules={[{ required: true, message: '이름을 입력해주세요.' }]}
          >
            <Input placeholder="고객 이름을 입력하세요" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="전화번호"
            rules={[{ required: true, message: '전화번호를 입력해주세요.' }]}
          >
            <Input placeholder="전화번호를 입력하세요" />
          </Form.Item>
          {editingReservation && (
            <Form.Item
              name="reservationDate"
              label="예약 날짜"
              rules={[{ required: true, message: '예약 날짜를 선택해주세요.' }]}
            >
              <DatePicker 
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                placeholder="예약 날짜를 선택하세요"
              />
            </Form.Item>
          )}
          <Form.Item
            name="guestCount"
            label="인원수"
            rules={[{ required: true, message: '인원수를 입력해주세요.' }]}
            initialValue={1}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="인원수를 입력하세요" />
          </Form.Item>
          <Form.Item
            label="예약 시간"
            required
          >
            <div style={{ display: 'flex', gap: '24px' }}>
              <Form.Item
                name="reservationHour"
                rules={[{ required: true, message: '시간을 선택해주세요.' }]}
                style={{ marginBottom: 0, flex: 1 }}
                valuePropName="value"
                getValueFromEvent={(value) => value}
              >
                <div>
                  <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>시간</div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '8px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    backgroundColor: '#fafafa'
                  }}>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hourValue = form.getFieldValue('reservationHour');
                      const isSelected = hourValue === i || selectedHour === i;
                      return (
                        <Button
                          key={i}
                          type={isSelected ? 'primary' : 'default'}
                          onClick={() => {
                            setSelectedHour(i);
                            form.setFieldsValue({ reservationHour: i });
                          }}
                          size="small"
                          style={{ minWidth: '45px' }}
                        >
                          {String(i).padStart(2, '0')}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </Form.Item>
              <Form.Item
                name="reservationMinute"
                rules={[{ required: true, message: '분을 선택해주세요.' }]}
                style={{ marginBottom: 0 }}
                valuePropName="value"
                getValueFromEvent={(value) => value}
              >
                <div>
                  <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>분</div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px',
                    padding: '8px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    backgroundColor: '#fafafa'
                  }}>
                    {[0, 15, 30, 45].map((min) => {
                      const minuteValue = form.getFieldValue('reservationMinute');
                      const isSelected = minuteValue === min || selectedMinute === min;
                      return (
                        <Button
                          key={min}
                          type={isSelected ? 'primary' : 'default'}
                          onClick={() => {
                            setSelectedMinute(min);
                            form.setFieldsValue({ reservationMinute: min });
                          }}
                          size="small"
                          style={{ minWidth: '50px' }}
                        >
                          {String(min).padStart(2, '0')}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item
            name="source"
            label="예약 방법"
            rules={[{ required: true, message: '예약 방법을 선택해주세요.' }]}
          >
            <Select placeholder="예약 방법을 선택하세요">
              <Option value="phone">전화</Option>
              <Option value="naver">네이버예약</Option>
            </Select>
          </Form.Item>
          {!permissions.isStaff && (
            <Form.Item name="staffId" label="담당자">
              <Select 
                placeholder="담당자를 선택하세요 (선택하지 않으면 '배정 중'으로 표시됩니다)"
                showSearch
                optionFilterProp="children"
                allowClear
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                notFoundContent={staffList.length === 0 ? '사원 목록을 불러올 수 없습니다.' : null}
              >
                {staffList.map((staff) => (
                  <Option key={staff.id} value={staff.id} label={staff.name || staff.username}>
                    {staff.name || staff.username}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="notes" label="메모">
            <Input.TextArea rows={3} placeholder="메모를 입력하세요 (선택사항)" />
          </Form.Item>
          </Form>
        </Modal>

      <Modal
        title="예약 상세 정보"
        open={statusModalVisible}
        onCancel={() => {
          setStatusModalVisible(false);
          setSelectedReservationForStatus(null);
        }}
        footer={null}
        width={600}
      >
        {selectedReservationForStatus && (
          <div>
            {/* 예약 정보 */}
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>예약 정보</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <strong>이름:</strong> {selectedReservationForStatus.customerName}
                </div>
                <div>
                  <strong>전화번호:</strong> {selectedReservationForStatus.phone}
                </div>
                <div>
                  <strong>예약 날짜:</strong> {selectedReservationForStatus.date ? dayjs(selectedReservationForStatus.date.toDate ? selectedReservationForStatus.date.toDate() : selectedReservationForStatus.date).format('YYYY-MM-DD') : '-'}
                </div>
                <div>
                  <strong>예약 시간:</strong> {selectedReservationForStatus.startTime ? dayjs(selectedReservationForStatus.startTime.toDate()).format('HH:mm') : '-'}
                </div>
                <div>
                  <strong>인원수:</strong> {selectedReservationForStatus.guestCount || 1}명
                </div>
                <div>
                  <strong>예약 방법:</strong> {selectedReservationForStatus.source === 'phone' ? '전화' : '네이버예약'}
                </div>
                <div>
                  <strong>담당자:</strong> {selectedReservationForStatus.staffName || '배정 중'}
                </div>
                <div>
                  <strong>생성자:</strong> {selectedReservationForStatus.createdByName || '-'}
                </div>
                {selectedReservationForStatus.notes && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>메모:</strong> {selectedReservationForStatus.notes}
                  </div>
                )}
                {selectedReservationForStatus.status && selectedReservationForStatus.status !== 'pending' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>상태:</strong>{' '}
                    {selectedReservationForStatus.status === 'completed' && <Tag color="green">이용 완료</Tag>}
                    {selectedReservationForStatus.status === 'cancelled' && <Tag color="orange">고객 요청 취소</Tag>}
                    {selectedReservationForStatus.status === 'noShow' && <Tag color="red">노쇼</Tag>}
                  </div>
                )}
              </div>
            </div>

            {/* 방문 여부 체크 */}
            {(!selectedReservationForStatus.status || selectedReservationForStatus.status === 'pending' || permissions.isStoreAdmin) && (
              <div>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>방문 여부 확인</h3>
                <p style={{ marginBottom: '16px', color: '#666' }}>
                  <strong>{selectedReservationForStatus.customerName}</strong>님의 방문 여부를 선택해주세요.
                  {selectedReservationForStatus.status && selectedReservationForStatus.status !== 'pending' && permissions.isStoreAdmin && (
                    <span style={{ color: '#ff9800', marginLeft: '8px' }}>(매장 관리자는 변경 가능)</span>
                  )}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Button
                    type="primary"
                    block
                    onClick={async () => {
                      try {
                        await updateDocument('reservations', selectedReservationForStatus.id, {
                          status: 'completed',
                        });
                        message.success('이용 완료로 처리되었습니다.');
                        setStatusModalVisible(false);
                        setSelectedReservationForStatus(null);
                      } catch (error) {
                        console.error('상태 업데이트 오류:', error);
                        message.error('상태 업데이트에 실패했습니다.');
                      }
                    }}
                  >
                    이용 완료
                  </Button>
                  <Button
                    block
                    onClick={async () => {
                      try {
                        await updateDocument('reservations', selectedReservationForStatus.id, {
                          status: 'cancelled',
                        });
                        message.success('고객 요청 취소로 처리되었습니다.');
                        setStatusModalVisible(false);
                        setSelectedReservationForStatus(null);
                      } catch (error) {
                        console.error('상태 업데이트 오류:', error);
                        message.error('상태 업데이트에 실패했습니다.');
                      }
                    }}
                  >
                    고객 요청 취소
                  </Button>
                  <Button
                    danger
                    block
                    onClick={async () => {
                      try {
                        await updateDocument('reservations', selectedReservationForStatus.id, {
                          status: 'noShow',
                        });
                        message.success('노쇼로 처리되었습니다.');
                        setStatusModalVisible(false);
                        setSelectedReservationForStatus(null);
                      } catch (error) {
                        console.error('상태 업데이트 오류:', error);
                        message.error('상태 업데이트에 실패했습니다.');
                      }
                    }}
                  >
                    노쇼
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

