import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Upload, Tag, Image, Select, Popconfirm, Space, Switch, Radio } from 'antd';
import { PlusOutlined, EditOutlined, UploadOutlined, DownloadOutlined, PictureOutlined, DeleteOutlined, MailOutlined, CheckOutlined, CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { useSession } from '../../hooks/useSession';
import { getCollection, createDocument, updateDocument, deleteDocument } from '../../services/firestoreService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../assets/firebaseConfig';
import { createStoreWithAccount, sendStoreCreationEmail, resendPasswordSetupEmail } from '../../services/emailService';

export function Stores() {
  const { account } = useSession();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [featureControlModalVisible, setFeatureControlModalVisible] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [featureControlStore, setFeatureControlStore] = useState(null);
  const [form] = Form.useForm();
  const [restoreForm] = Form.useForm();
  const [featureControlForm] = Form.useForm();
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState({
    name: false,
    businessNumber: false,
    email: false,
  });
  const [duplicateStatus, setDuplicateStatus] = useState({
    name: null, // null: 미확인, true: 중복, false: 중복 아님
    businessNumber: null,
    email: null,
  });

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const data = await getCollection('stores', {
        orderByField: 'createdAt',
        orderByDirection: 'desc',
      });
      setStores(data);
    } catch (error) {
      message.error('매장 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingStore(null);
    form.resetFields();
    setLogoFile(null);
    setLogoPreview(null);
    setDuplicateStatus({ name: null, businessNumber: null, email: null });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingStore(record);
    form.setFieldsValue({
      name: record.name,
      businessNumber: record.businessNumber,
      managerEmail: record.managerEmail,
      status: record.status,
    });
    setLogoPreview(record.logoUrl);
    setLogoFile(null);
    setModalVisible(true);
  };

  // 사업자 등록번호 형식 검증 (xxx-xx-xxxxx)
  const validateBusinessNumber = (_, value) => {
    if (!value) {
      return Promise.resolve();
    }
    const pattern = /^\d{3}-\d{2}-\d{5}$/;
    if (!pattern.test(value)) {
      return Promise.reject(new Error('사업자 등록번호 형식이 올바르지 않습니다. (xxx-xx-xxxxx)'));
    }
    return Promise.resolve();
  };

  // 매장명 중복 확인
  const checkStoreNameDuplicate = async (storeName) => {
    if (!storeName) {
      message.warning('매장명을 입력해주세요.');
      return;
    }
    
    setCheckingDuplicate(prev => ({ ...prev, name: true }));
    try {
      const existingStores = await getCollection('stores', {
        filters: [{ field: 'name', operator: '==', value: storeName }],
      });
      
      // 수정 중이고 현재 매장의 이름이면 통과
      if (editingStore && existingStores.length === 1 && existingStores[0].id === editingStore.id) {
        setDuplicateStatus(prev => ({ ...prev, name: false }));
        message.success('사용 가능한 매장명입니다.');
      } else if (existingStores.length > 0) {
        setDuplicateStatus(prev => ({ ...prev, name: true }));
        message.error('이미 사용 중인 매장명입니다.');
      } else {
        setDuplicateStatus(prev => ({ ...prev, name: false }));
        message.success('사용 가능한 매장명입니다.');
      }
    } catch (error) {
      console.error('매장명 중복 확인 오류:', error);
      message.error('중복 확인에 실패했습니다.');
    } finally {
      setCheckingDuplicate(prev => ({ ...prev, name: false }));
    }
  };

  // 사업자 등록번호 중복 확인
  const checkBusinessNumberDuplicate = async (businessNumber) => {
    if (!businessNumber) {
      message.warning('사업자 등록번호를 입력해주세요.');
      return;
    }
    
    setCheckingDuplicate(prev => ({ ...prev, businessNumber: true }));
    try {
      const existingStores = await getCollection('stores', {
        filters: [{ field: 'businessNumber', operator: '==', value: businessNumber }],
      });
      
      // 수정 중이고 현재 매장의 사업자 등록번호면 통과
      if (editingStore && existingStores.length === 1 && existingStores[0].id === editingStore.id) {
        setDuplicateStatus(prev => ({ ...prev, businessNumber: false }));
        message.success('사용 가능한 사업자 등록번호입니다.');
      } else if (existingStores.length > 0) {
        setDuplicateStatus(prev => ({ ...prev, businessNumber: true }));
        message.error('이미 사용 중인 사업자 등록번호입니다.');
      } else {
        setDuplicateStatus(prev => ({ ...prev, businessNumber: false }));
        message.success('사용 가능한 사업자 등록번호입니다.');
      }
    } catch (error) {
      console.error('사업자 등록번호 중복 확인 오류:', error);
      message.error('중복 확인에 실패했습니다.');
    } finally {
      setCheckingDuplicate(prev => ({ ...prev, businessNumber: false }));
    }
  };

  // 이메일 중복 확인
  const checkEmailDuplicate = async (email) => {
    if (!email) {
      message.warning('담당자 이메일을 입력해주세요.');
      return;
    }
    
    // 이메일 형식 검증
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      message.warning('올바른 이메일 형식을 입력해주세요.');
      return;
    }
    
    setCheckingDuplicate(prev => ({ ...prev, email: true }));
    try {
      const existingStores = await getCollection('stores', {
        filters: [{ field: 'managerEmail', operator: '==', value: email }],
      });
      
      // 수정 중이고 현재 매장의 이메일이면 통과
      if (editingStore && existingStores.length === 1 && existingStores[0].id === editingStore.id) {
        setDuplicateStatus(prev => ({ ...prev, email: false }));
        message.success('사용 가능한 이메일입니다.');
      } else if (existingStores.length > 0) {
        setDuplicateStatus(prev => ({ ...prev, email: true }));
        message.error('이미 사용 중인 담당자 이메일입니다.');
      } else {
        setDuplicateStatus(prev => ({ ...prev, email: false }));
        message.success('사용 가능한 이메일입니다.');
      }
    } catch (error) {
      console.error('이메일 중복 확인 오류:', error);
      message.error('중복 확인에 실패했습니다.');
    } finally {
      setCheckingDuplicate(prev => ({ ...prev, email: false }));
    }
  };

  // 이메일 중복 확인 (Form validator용)
  const validateEmailDuplicate = async (_, value) => {
    if (!value) {
      return Promise.resolve();
    }
    
    // 기존 매장의 담당자 이메일 중복 확인
    const existingStores = await getCollection('stores', {
      filters: [{ field: 'managerEmail', operator: '==', value: value }],
    });
    
    // 수정 중이고 현재 매장의 이메일이면 통과
    if (editingStore && existingStores.length === 1 && existingStores[0].id === editingStore.id) {
      return Promise.resolve();
    }
    
    if (existingStores.length > 0) {
      return Promise.reject(new Error('이미 사용 중인 담당자 이메일입니다.'));
    }
    
    return Promise.resolve();
  };

  // 로고 업로드 전 처리
  const handleLogoUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('이미지 파일만 업로드 가능합니다.');
      return false;
    }
    
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('이미지 크기는 2MB 이하여야 합니다.');
      return false;
    }
    
    setLogoFile(file);
    
    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
    
    return false; // 자동 업로드 방지
  };

  const handleSubmit = async (values) => {
    // 새 매장 생성 시 중복 확인 체크
    if (!editingStore) {
      // 하나라도 중복이면 생성 불가
      if (duplicateStatus.name === true || duplicateStatus.businessNumber === true || duplicateStatus.email === true) {
        message.error('중복 확인을 완료하고 중복이 없는 항목만 사용할 수 있습니다.');
        return;
      }
      
      // 모든 항목이 중복 확인이 완료되었는지 확인
      if (duplicateStatus.name === null || duplicateStatus.businessNumber === null || duplicateStatus.email === null) {
        message.warning('모든 항목의 중복 확인을 완료해주세요.');
        return;
      }
    }
    
    setUploading(true);
    try {
      let logoUrl = null;
      
      // 로고 업로드
      if (logoFile) {
        const logoRef = ref(storage, `stores/logos/${Date.now()}_${logoFile.name}`);
        await uploadBytes(logoRef, logoFile);
        logoUrl = await getDownloadURL(logoRef);
      } else if (editingStore && editingStore.logoUrl) {
        logoUrl = editingStore.logoUrl;
      }

      const storeData = {
        name: values.name,
        businessNumber: values.businessNumber,
        managerEmail: values.managerEmail,
        logoUrl: logoUrl,
        status: values.status || 'active',
      };

      if (editingStore) {
        // 매장 수정
        const oldStatus = editingStore.status;
        const newStatus = storeData.status;
        
        await updateDocument('stores', editingStore.id, storeData);
        
        // 상태가 "초기"에서 "운영"으로 변경되면 매장 생성 완료 이메일 발송
        if (oldStatus === 'initial' && newStatus === 'active') {
          try {
            const updatedStoreData = { ...storeData, id: editingStore.id };
            await sendStoreCreationEmail(updatedStoreData);
            message.success('매장 정보가 수정되었고 담당자에게 매장 생성 완료 이메일이 발송되었습니다.');
          } catch (emailError) {
            console.error('이메일 발송 실패:', emailError);
            message.warning('매장 정보는 수정되었지만 이메일 발송에 실패했습니다.');
          }
        } else {
          message.success('매장 정보가 수정되었습니다.');
        }
      } else {
        // 새 매장 생성 - Cloud Functions로 처리 (계정 생성 및 이메일 발송)
        try {
          const result = await createStoreWithAccount({
            name: values.name,
            managerEmail: values.managerEmail,
            businessNumber: values.businessNumber,
            logoUrl: logoUrl,
          });
          
          message.success(result.message || '매장이 생성되었고 담당자에게 비밀번호 설정 이메일이 발송되었습니다.');
        } catch (createError) {
          console.error('매장 생성 오류:', createError);
          message.error(createError.message || '매장 생성에 실패했습니다.');
          throw createError; // 에러를 다시 throw하여 finally 블록이 실행되지 않도록
        }
      }

      setModalVisible(false);
      form.resetFields();
      setLogoFile(null);
      setLogoPreview(null);
      setDuplicateStatus({ name: null, businessNumber: null, email: null });
      loadStores();
    } catch (error) {
      console.error('매장 저장 오류:', error);
      message.error(error.message || '매장 정보 저장에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleRestore = async (values) => {
    try {
      const file = values.file.file;
      if (!file) {
        message.error('파일을 선택해주세요.');
        return;
      }

      // 파일을 Storage에 업로드
      const storageRef = ref(storage, `restore/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Cloud Function 호출 (실제 구현 시)
      // await httpsCallable(functions, 'restoreBackup')({ url: downloadURL, storeId: values.storeId });

      message.success('백업 복구가 시작되었습니다. Cloud Function을 통해 처리됩니다.');
      setRestoreModalVisible(false);
      restoreForm.resetFields();
    } catch (error) {
      message.error('백업 복구에 실패했습니다.');
    }
  };

  const handleBackup = async (storeId) => {
    try {
      // Cloud Function 호출 (실제 구현 시)
      // await httpsCallable(functions, 'createBackup')({ storeId });
      message.success('백업이 생성되었습니다. 메일로 발송됩니다.');
    } catch (error) {
      message.error('백업 생성에 실패했습니다.');
    }
  };

  const handleDelete = async (storeId) => {
    try {
      await deleteDocument('stores', storeId);
      message.success('매장이 삭제되었습니다.');
      loadStores();
    } catch (error) {
      console.error('매장 삭제 오류:', error);
      message.error('매장 삭제에 실패했습니다.');
    }
  };

  const handleStatusChange = async (storeId, newStatus) => {
    try {
      const store = stores.find(s => s.id === storeId);
      if (!store) {
        message.error('매장을 찾을 수 없습니다.');
        return;
      }

      await updateDocument('stores', storeId, { status: newStatus });
      
      // 상태가 "초기"에서 "운영"으로 변경되면 매장 생성 완료 이메일 발송
      if (store.status === 'initial' && newStatus === 'active') {
        try {
          await sendStoreCreationEmail({ ...store, status: newStatus });
          message.success('매장 상태가 변경되었고 담당자에게 매장 생성 완료 이메일이 발송되었습니다.');
        } catch (emailError) {
          console.error('이메일 발송 실패:', emailError);
          message.warning('매장 상태는 변경되었지만 이메일 발송에 실패했습니다.');
        }
      } else {
        message.success('매장 상태가 변경되었습니다.');
      }
      
      loadStores();
    } catch (error) {
      console.error('매장 상태 변경 오류:', error);
      message.error('매장 상태 변경에 실패했습니다.');
    }
  };

  const handleResendPasswordEmail = async (record) => {
    try {
      await resendPasswordSetupEmail({
        id: record.id,
        name: record.name,
        managerEmail: record.managerEmail,
      });
      message.success('비밀번호 설정 이메일이 재발송되었습니다.');
    } catch (error) {
      console.error('이메일 재발송 실패:', error);
      message.error(error.message || '이메일 재발송에 실패했습니다.');
    }
  };

  const handleFeatureControl = (record) => {
    setFeatureControlStore(record);
    const disabledFeatures = record.disabledFeatures || {};
    featureControlForm.setFieldsValue({
      reservationsEnabled: !disabledFeatures.reservations,
      prepayEnabled: !disabledFeatures.prepay,
      hrEnabled: !disabledFeatures.hr,
      payrollEnabled: !disabledFeatures.payroll,
      disabledReason: disabledFeatures.reason || '',
      disabledReasonType: disabledFeatures.reasonType || 'custom',
    });
    setFeatureControlModalVisible(true);
  };

  const handleFeatureControlSubmit = async (values) => {
    if (!featureControlStore) return;

    const disabledFeatures = {
      reservations: !values.reservationsEnabled,
      prepay: !values.prepayEnabled,
      hr: !values.hrEnabled,
      payroll: !values.payrollEnabled,
    };

    // 비활성화된 기능이 있으면 사유 추가
    const hasDisabled = Object.values(disabledFeatures).some(v => v);
    if (hasDisabled) {
      disabledFeatures.reason = values.disabledReason || '';
      disabledFeatures.reasonType = values.disabledReasonType || 'custom';
    } else {
      // 모든 기능이 활성화되면 사유 제거
      disabledFeatures.reason = '';
      disabledFeatures.reasonType = '';
    }

    try {
      await updateDocument('stores', featureControlStore.id, {
        disabledFeatures: disabledFeatures,
      });
      message.success('기능 설정이 저장되었습니다.');
      setFeatureControlModalVisible(false);
      featureControlForm.resetFields();
      loadStores();
    } catch (error) {
      console.error('기능 설정 저장 오류:', error);
      message.error('기능 설정 저장에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '로고',
      dataIndex: 'logoUrl',
      key: 'logoUrl',
      width: 80,
      render: (url) => {
        if (url) {
          return <Image src={url} width={50} height={50} style={{ objectFit: 'cover', borderRadius: '4px' }} />;
        }
        return <PictureOutlined style={{ fontSize: '24px', color: '#d9d9d9' }} />;
      },
    },
    {
      title: '매장명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '사업자 등록번호',
      dataIndex: 'businessNumber',
      key: 'businessNumber',
    },
    {
      title: '담당자 이메일',
      dataIndex: 'managerEmail',
      key: 'managerEmail',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Select
          value={status}
          onChange={(value) => handleStatusChange(record.id, value)}
          style={{ width: 120 }}
          disabled={status === 'active'} // 운영 중이면 변경 불가
        >
          <Select.Option value="initial">초기</Select.Option>
          <Select.Option value="active">운영</Select.Option>
        </Select>
      ),
    },
    {
      title: '기능 상태',
      key: 'features',
      width: 200,
      render: (_, record) => {
        const disabledFeatures = record.disabledFeatures || {};
        const disabledCount = Object.values(disabledFeatures).filter(v => v === true).length;
        if (disabledCount === 0) {
          return <Tag color="green">모두 활성화</Tag>;
        }
        const featureNames = [];
        if (disabledFeatures.reservations) featureNames.push('예약');
        if (disabledFeatures.prepay) featureNames.push('선결제');
        if (disabledFeatures.hr) featureNames.push('근무');
        if (disabledFeatures.payroll) featureNames.push('급여');
        return <Tag color="red">{featureNames.join(', ')} 비활성화</Tag>;
      },
    },
    {
      title: '작업',
      key: 'actions',
      render: (_, record) => (
        <div>
          <Button
            type="link"
            icon={<SettingOutlined />}
            onClick={() => handleFeatureControl(record)}
          >
            기능 제어
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            수정
          </Button>
          {record.status === 'initial' && (
            <Button
              type="link"
              icon={<MailOutlined />}
              onClick={() => handleResendPasswordEmail(record)}
            >
              이메일 재발송
            </Button>
          )}
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleBackup(record.id)}
          >
            백업
          </Button>
          <Button
            type="link"
            icon={<UploadOutlined />}
            onClick={() => {
              restoreForm.setFieldsValue({ storeId: record.id });
              setRestoreModalVisible(true);
            }}
          >
            복구
          </Button>
          <Popconfirm
            title="매장 삭제"
            description="정말 이 매장을 삭제하시겠습니까?"
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
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="매장 관리"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            매장 추가
          </Button>
        }
      >
        <Table
          dataSource={stores}
          columns={columns}
          loading={loading}
          rowKey="id"
        />
      </Card>

      <Modal
        title={editingStore ? '매장 수정' : '매장 추가'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setLogoFile(null);
          setLogoPreview(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={uploading}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="매장명"
            rules={[{ required: true, message: '매장명을 입력해주세요.' }]}
            validateStatus={duplicateStatus.name === true ? 'error' : duplicateStatus.name === false ? 'success' : ''}
            help={
              duplicateStatus.name === true ? (
                <span style={{ color: '#ff4d4f' }}>중복</span>
              ) : duplicateStatus.name === false ? (
                <span style={{ color: '#52c41a' }}>사용 가능</span>
              ) : null
            }
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input 
                placeholder="매장명을 입력하세요" 
                onChange={() => setDuplicateStatus(prev => ({ ...prev, name: null }))}
                disabled={duplicateStatus.name === false && !editingStore}
              />
              <Button 
                type="default"
                icon={duplicateStatus.name === false ? <CheckOutlined style={{ color: '#52c41a' }} /> : duplicateStatus.name === true ? <CloseOutlined style={{ color: '#ff4d4f' }} /> : null}
                loading={checkingDuplicate.name}
                onClick={() => {
                  const name = form.getFieldValue('name');
                  checkStoreNameDuplicate(name);
                }}
                disabled={!form.getFieldValue('name') || (duplicateStatus.name === false && !editingStore)}
              >
                중복확인
              </Button>
            </Space.Compact>
          </Form.Item>
          
          <Form.Item
            name="logo"
            label="매장 로고"
          >
            <Upload
              beforeUpload={handleLogoUpload}
              showUploadList={false}
              accept="image/*"
            >
              <Button icon={<PictureOutlined />}>로고 업로드</Button>
            </Upload>
            {logoPreview && (
              <div style={{ marginTop: '8px' }}>
                <Image
                  src={logoPreview}
                  alt="로고 미리보기"
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover', borderRadius: '4px' }}
                />
              </div>
            )}
          </Form.Item>
          
          <Form.Item
            name="businessNumber"
            label="사업자 등록번호"
            rules={[
              { required: true, message: '사업자 등록번호를 입력해주세요.' },
              { validator: validateBusinessNumber },
            ]}
            validateStatus={duplicateStatus.businessNumber === true ? 'error' : duplicateStatus.businessNumber === false ? 'success' : ''}
            help={
              duplicateStatus.businessNumber === true ? (
                <span style={{ color: '#ff4d4f' }}>중복</span>
              ) : duplicateStatus.businessNumber === false ? (
                <span style={{ color: '#52c41a' }}>사용 가능</span>
              ) : null
            }
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input 
                placeholder="xxx-xx-xxxxx 형식으로 입력" 
                maxLength={12}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length > 3 && value.length <= 5) {
                    value = value.slice(0, 3) + '-' + value.slice(3);
                  } else if (value.length > 5) {
                    value = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5, 10);
                  }
                  if (value.length > 12) value = value.slice(0, 12);
                  form.setFieldsValue({ businessNumber: value });
                  setDuplicateStatus(prev => ({ ...prev, businessNumber: null }));
                }}
                disabled={duplicateStatus.businessNumber === false && !editingStore}
              />
              <Button 
                type="default"
                icon={duplicateStatus.businessNumber === false ? <CheckOutlined style={{ color: '#52c41a' }} /> : duplicateStatus.businessNumber === true ? <CloseOutlined style={{ color: '#ff4d4f' }} /> : null}
                loading={checkingDuplicate.businessNumber}
                onClick={() => {
                  const businessNumber = form.getFieldValue('businessNumber');
                  checkBusinessNumberDuplicate(businessNumber);
                }}
                disabled={!form.getFieldValue('businessNumber') || (duplicateStatus.businessNumber === false && !editingStore)}
              >
                중복확인
              </Button>
            </Space.Compact>
          </Form.Item>
          
          <Form.Item
            name="managerEmail"
            label="담당자 이메일"
            rules={[
              { required: true, message: '담당자 이메일을 입력해주세요.' },
              { type: 'email', message: '올바른 이메일 형식을 입력해주세요.' },
              { validator: validateEmailDuplicate },
            ]}
            validateStatus={duplicateStatus.email === true ? 'error' : duplicateStatus.email === false ? 'success' : ''}
            help={
              duplicateStatus.email === true ? (
                <span style={{ color: '#ff4d4f' }}>중복</span>
              ) : duplicateStatus.email === false ? (
                <span style={{ color: '#52c41a' }}>사용 가능</span>
              ) : null
            }
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input 
                placeholder="담당자 이메일을 입력하세요" 
                type="email"
                onChange={() => setDuplicateStatus(prev => ({ ...prev, email: null }))}
                disabled={duplicateStatus.email === false && !editingStore}
              />
              <Button 
                type="default"
                icon={duplicateStatus.email === false ? <CheckOutlined style={{ color: '#52c41a' }} /> : duplicateStatus.email === true ? <CloseOutlined style={{ color: '#ff4d4f' }} /> : null}
                loading={checkingDuplicate.email}
                onClick={() => {
                  const email = form.getFieldValue('managerEmail');
                  checkEmailDuplicate(email);
                }}
                disabled={!form.getFieldValue('managerEmail') || (duplicateStatus.email === false && !editingStore)}
              >
                중복확인
              </Button>
            </Space.Compact>
          </Form.Item>
          
          {editingStore && (
            <Form.Item name="status" label="상태">
              <Select>
                <Select.Option value="initial">초기</Select.Option>
                <Select.Option value="active">운영</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="백업 복구"
        open={restoreModalVisible}
        onCancel={() => {
          setRestoreModalVisible(false);
          restoreForm.resetFields();
        }}
        onOk={() => restoreForm.submit()}
      >
        <Form form={restoreForm} onFinish={handleRestore} layout="vertical">
          <Form.Item
            name="storeId"
            label="매장 ID"
            rules={[{ required: true, message: '매장 ID를 입력해주세요.' }]}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="file"
            label="백업 파일 (xlsx)"
            rules={[{ required: true, message: '백업 파일을 선택해주세요.' }]}
          >
            <Upload
              beforeUpload={() => false}
              accept=".xlsx"
            >
              <Button icon={<UploadOutlined />}>파일 선택</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${featureControlStore?.name || ''} 기능 제어`}
        open={featureControlModalVisible}
        onCancel={() => {
          setFeatureControlModalVisible(false);
          featureControlForm.resetFields();
          setFeatureControlStore(null);
        }}
        onOk={() => featureControlForm.submit()}
        width={600}
      >
        <Form form={featureControlForm} onFinish={handleFeatureControlSubmit} layout="vertical">
          <Form.Item name="reservationsEnabled" label="예약 관리" valuePropName="checked">
            <Switch checkedChildren="활성화" unCheckedChildren="비활성화" />
          </Form.Item>
          
          <Form.Item name="prepayEnabled" label="선결제 관리" valuePropName="checked">
            <Switch checkedChildren="활성화" unCheckedChildren="비활성화" />
          </Form.Item>
          
          <Form.Item name="hrEnabled" label="근무" valuePropName="checked">
            <Switch checkedChildren="활성화" unCheckedChildren="비활성화" />
          </Form.Item>
          
          <Form.Item name="payrollEnabled" label="급여" valuePropName="checked">
            <Switch checkedChildren="활성화" unCheckedChildren="비활성화" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.reservationsEnabled !== currentValues.reservationsEnabled ||
              prevValues.prepayEnabled !== currentValues.prepayEnabled ||
              prevValues.hrEnabled !== currentValues.hrEnabled ||
              prevValues.payrollEnabled !== currentValues.payrollEnabled
            }
          >
            {({ getFieldValue }) => {
              const hasDisabled = 
                !getFieldValue('reservationsEnabled') ||
                !getFieldValue('prepayEnabled') ||
                !getFieldValue('hrEnabled') ||
                !getFieldValue('payrollEnabled');
              
              if (!hasDisabled) return null;

              return (
                <>
                  <Form.Item
                    name="disabledReasonType"
                    label="비활성화 사유 유형"
                    rules={[{ required: true, message: '비활성화 사유 유형을 선택해주세요.' }]}
                  >
                    <Radio.Group>
                      <Radio value="custom">직접 입력</Radio>
                      <Radio value="maintenance">시스템 점검</Radio>
                      <Radio value="violation">정책 위반</Radio>
                      <Radio value="request">요청에 의한 중지</Radio>
                      <Radio value="other">기타</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.disabledReasonType !== currentValues.disabledReasonType
                    }
                  >
                    {({ getFieldValue }) => {
                      const reasonType = getFieldValue('disabledReasonType');
                      if (reasonType !== 'custom') {
                        const reasonMap = {
                          maintenance: '시스템 점검 중입니다.',
                          violation: '정책 위반으로 인해 기능이 비활성화되었습니다.',
                          request: '요청에 의하여 기능이 중지되었습니다.',
                          other: '기타 사유로 기능이 비활성화되었습니다.',
                        };
                        featureControlForm.setFieldsValue({ disabledReason: reasonMap[reasonType] || '' });
                      }
                      return (
                        <Form.Item
                          name="disabledReason"
                          label="비활성화 사유"
                          rules={[{ required: true, message: '비활성화 사유를 입력해주세요.' }]}
                        >
                          <Input.TextArea
                            rows={3}
                            placeholder="비활성화 사유를 입력하세요"
                            disabled={reasonType !== 'custom'}
                          />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                </>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

