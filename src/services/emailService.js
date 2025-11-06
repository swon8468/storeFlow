import { httpsCallable } from 'firebase/functions';
import { functions } from '../assets/firebaseConfig';

/**
 * 매장 생성 및 계정 생성 (Cloud Functions로 처리)
 */
export async function createStoreWithAccount(storeData) {
  try {
    const createStoreFunction = httpsCallable(functions, 'createStoreWithAccount');
    const result = await createStoreFunction({
      storeName: storeData.name,
      managerEmail: storeData.managerEmail,
      businessNumber: storeData.businessNumber,
      logoUrl: storeData.logoUrl,
    });
    return result.data;
  } catch (error) {
    console.error('매장 생성 오류:', error);
    throw error;
  }
}

/**
 * 비밀번호 설정 이메일 발송 (매장 생성 시)
 */
export async function sendPasswordSetupEmail(storeData) {
  try {
    const sendEmailFunction = httpsCallable(functions, 'sendPasswordSetupEmail');
    const result = await sendEmailFunction({
      storeName: storeData.name,
      managerEmail: storeData.managerEmail,
      storeId: storeData.id,
    });
    return result.data;
  } catch (error) {
    console.error('이메일 발송 오류:', error);
    throw error;
  }
}

/**
 * 매장 생성 완료 이메일 발송 (매장 상태가 "운영"으로 변경될 때)
 */
export async function sendStoreCreationEmail(storeData) {
  try {
    const sendEmailFunction = httpsCallable(functions, 'sendStoreCreationEmail');
    const result = await sendEmailFunction({
      storeName: storeData.name,
      managerEmail: storeData.managerEmail,
      businessNumber: storeData.businessNumber,
      storeId: storeData.id,
    });
    return result.data;
  } catch (error) {
    console.error('이메일 발송 오류:', error);
    throw error;
  }
}

/**
 * 비밀번호 설정 이메일 재발송
 */
export async function resendPasswordSetupEmail(storeData) {
  try {
    const resendEmailFunction = httpsCallable(functions, 'resendPasswordSetupEmail');
    const result = await resendEmailFunction({
      storeName: storeData.name,
      managerEmail: storeData.managerEmail,
      storeId: storeData.id,
    });
    return result.data;
  } catch (error) {
    console.error('이메일 재발송 오류:', error);
    throw error;
  }
}

/**
 * 이메일 중복 확인
 */
export async function checkEmailDuplicate(email) {
  try {
    const checkEmailFunction = httpsCallable(functions, 'checkEmailDuplicate');
    const result = await checkEmailFunction({ email });
    return result.data;
  } catch (error) {
    console.error('이메일 중복 확인 오류:', error);
    throw error;
  }
}

