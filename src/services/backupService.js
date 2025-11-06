import { httpsCallable } from 'firebase/functions';
import { functions } from '../assets/firebaseConfig';

/**
 * 백업 생성 요청 (Cloud Function 호출)
 */
export async function createBackup(storeId = null) {
  try {
    const createBackupFunction = httpsCallable(functions, 'createBackup');
    const result = await createBackupFunction({ storeId });
    return result.data;
  } catch (error) {
    throw error;
  }
}

/**
 * 백업 복구 요청
 */
export async function restoreBackup(storeId, fileUrl, mode = 'merge') {
  try {
    const restoreBackupFunction = httpsCallable(functions, 'restoreBackup');
    const result = await restoreBackupFunction({
      storeId,
      url: fileUrl,
      mode,
    });
    return result.data;
  } catch (error) {
    throw error;
  }
}

