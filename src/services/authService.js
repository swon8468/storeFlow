import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../assets/firebaseConfig';

/**
 * 매장 선택 후 로그인 (사원용 - 비밀번호 없이, Firestore만 사용)
 * @param {string} storeId - 선택된 매장 ID
 * @param {string} username - 사용자명
 */
export async function loginWithStore(storeId, username) {
  // 사원 계정은 비밀번호 없이 로그인 (Firebase Auth 없이 Firestore에서만 확인)
  console.log('사원 로그인 시작:', { storeId, username });
  
  try {
    // Firestore에서 계정 정보 확인
    const accountsRef = collection(db, 'accounts');
    console.log('Firestore 쿼리 생성:', { storeId, username, role: 'staff' });
    
    const q = query(
      accountsRef,
      where('storeId', '==', storeId),
      where('username', '==', username),
      where('role', '==', 'staff')
    );
    
    console.log('Firestore 쿼리 실행 중...');
    const querySnapshot = await getDocs(q);
    console.log('쿼리 결과:', {
      size: querySnapshot.size,
      empty: querySnapshot.empty,
      docs: querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
    });
    
    if (querySnapshot.empty) {
      console.warn('사원 계정을 찾을 수 없음:', { storeId, username });
      throw new Error('존재하지 않는 사원 계정입니다. 매장과 사원 ID를 확인해주세요.');
    }
    
    const accountDoc = querySnapshot.docs[0];
    const accountData = accountDoc.data();
    console.log('사원 계정 정보:', { id: accountDoc.id, ...accountData });
    
    // storeId를 localStorage에 저장
    localStorage.setItem('selectedStoreId', storeId);
    
    // 세션 정보 저장 (Firebase Auth 없이)
    const uid = accountData.uid || accountDoc.id;
    const staffSession = {
      uid: uid,
      storeId: storeId,
      username: username,
      role: 'staff',
    };
    localStorage.setItem('staffSession', JSON.stringify(staffSession));
    console.log('세션 정보 저장 완료:', staffSession);
    
    const result = { 
      user: { uid: uid }, 
      account: { id: accountDoc.id, ...accountData, storeId } 
    };
    console.log('로그인 성공:', result);
    return result;
  } catch (error) {
    console.error('사원 로그인 오류:', error);
    console.error('오류 상세:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    
    // Firestore 권한 오류 처리
    if (error.code === 'permission-denied') {
      throw new Error('매장 목록 조회 권한이 없습니다. 관리자에게 문의하세요.');
    }
    
    // 쿼리 오류 처리
    if (error.code === 'failed-precondition') {
      throw new Error('데이터베이스 인덱스가 필요합니다. 관리자에게 문의하세요.');
    }
    
    // 기존 에러 메시지가 있으면 그대로 사용
    if (error.message) {
      throw error;
    } else {
      throw new Error(`로그인 실패: ${error.code || '알 수 없는 오류'}`);
    }
  }
}

/**
 * 최고관리자 로그인
 */
export async function loginSuperAdmin(email, password) {
  try {
    console.log('Firebase Auth 로그인 시도:', email);
    
    // Firebase Auth 로그인
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('Firebase Auth 로그인 성공, UID:', user.uid);
    
    // Firestore에서 accounts 문서 조회
    const accountDocRef = doc(db, 'accounts', user.uid);
    console.log('Firestore 문서 조회:', accountDocRef.path);
    
    const accountDoc = await getDoc(accountDocRef);
    console.log('Firestore 문서 존재 여부:', accountDoc.exists());
    
    if (!accountDoc.exists()) {
      console.error('계정 문서가 존재하지 않습니다. UID:', user.uid);
      await firebaseSignOut(auth);
      throw new Error(`계정 정보를 찾을 수 없습니다. 
Firestore의 accounts 컬렉션에 UID "${user.uid}" 문서가 있는지 확인하세요.
Firebase Authentication에는 등록되어 있지만 Firestore에 accounts 문서가 없을 수 있습니다.`);
    }
    
    const accountData = accountDoc.data();
    console.log('계정 데이터:', accountData);
    
    if (!accountData.role) {
      console.error('role 필드가 없습니다. 계정 데이터:', accountData);
      await firebaseSignOut(auth);
      throw new Error('계정에 role 필드가 없습니다. Firestore 문서에 role 필드를 추가하세요.');
    }
    
    if (accountData.role !== 'superAdmin') {
      console.error('권한이 없습니다. role:', accountData.role);
      await firebaseSignOut(auth);
      throw new Error(`최고관리자 권한이 없습니다. 
현재 role: "${accountData.role}"
필요한 role: "superAdmin"
Firestore 문서의 role 필드를 "superAdmin"으로 변경하세요.`);
    }
    
    console.log('로그인 완료:', { uid: user.uid, role: accountData.role });
    return { user, account: { id: accountDoc.id, ...accountData } };
  } catch (error) {
    console.error('loginSuperAdmin 오류:', error);
    console.error('오류 코드:', error.code);
    console.error('오류 메시지:', error.message);
    
    // Firebase Auth 에러 메시지 개선
    if (error.code === 'auth/user-not-found') {
      throw new Error(`존재하지 않는 이메일입니다.
Firebase Authentication에 "${email}" 이메일로 등록된 사용자가 없습니다.
Firebase Console > Authentication에서 사용자를 생성하세요.`);
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('비밀번호가 일치하지 않습니다.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('유효하지 않은 이메일 형식입니다.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('네트워크 오류가 발생했습니다. 인터넷 연결을 확인하세요.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('너무 많은 로그인 시도가 있었습니다. 나중에 다시 시도하세요.');
    } else if (error.code === 'permission-denied') {
      throw new Error('Firestore 접근 권한이 없습니다. 보안 규칙을 확인하세요.');
    } else if (error.message) {
      // 이미 처리된 에러는 그대로 전달
      throw error;
    } else {
      // 알 수 없는 오류
      const errorMsg = `로그인 실패
오류 코드: ${error.code || '없음'}
오류 메시지: ${error.message || '알 수 없는 오류'}
콘솔을 확인하여 자세한 정보를 확인하세요.`;
      throw new Error(errorMsg);
    }
  }
}

/**
 * 로그아웃
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    // Firebase Auth에 로그인하지 않은 경우도 처리
    console.log('Firebase Auth logout skipped:', error);
  }
  localStorage.removeItem('selectedStoreId');
  localStorage.removeItem('staffSession');
}

/**
 * 매장 담당자 로그인 (이메일/비밀번호)
 */
export async function loginStoreAdmin(email, password) {
  try {
    // Firebase Auth 로그인
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 계정 정보 확인
    const accountDoc = await getDoc(doc(db, 'accounts', user.uid));
    if (!accountDoc.exists()) {
      await firebaseSignOut(auth);
      throw new Error('계정 정보를 찾을 수 없습니다.');
    }
    
    const accountData = accountDoc.data();
    
    // storeAdmin 역할 확인
    if (accountData.role !== 'storeAdmin') {
      await firebaseSignOut(auth);
      throw new Error('매장 담당자 계정이 아닙니다.');
    }
    
    // storeId 확인
    if (!accountData.storeId) {
      await firebaseSignOut(auth);
      throw new Error('매장 정보가 설정되지 않았습니다.');
    }
    
    // storeId를 localStorage에 저장
    localStorage.setItem('selectedStoreId', accountData.storeId);
    
    return { user, account: { id: accountDoc.id, ...accountData } };
  } catch (error) {
    // Firebase Auth 에러 메시지 개선
    if (error.code === 'auth/user-not-found') {
      throw new Error('존재하지 않는 이메일입니다.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('비밀번호가 일치하지 않습니다.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('유효하지 않은 이메일 형식입니다.');
    } else if (error.message) {
      throw error;
    } else {
      throw new Error(`로그인 실패: ${error.code || error.message || '알 수 없는 오류'}`);
    }
  }
}

/**
 * 매장 목록 조회 (로그인 전)
 */
export async function getStores() {
  try {
    console.log('매장 목록 조회 시작 (active만)');
    const storesRef = collection(db, 'stores');
    // status가 'active'인 매장만 조회
    const q = query(storesRef, where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    const stores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('매장 목록 조회 결과:', stores);
    return stores;
  } catch (error) {
    console.error('매장 목록 조회 오류:', error);
    console.error('오류 상세:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    // 인덱스 오류가 발생하면 클라이언트에서 필터링
    if (error.code === 'failed-precondition') {
      console.warn('인덱스 오류 발생, 클라이언트에서 필터링 시도');
      try {
        const storesRef = collection(db, 'stores');
        const snapshot = await getDocs(storesRef);
        const allStores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeStores = allStores.filter(store => store.status === 'active');
        console.log('클라이언트 필터링 결과:', activeStores);
        return activeStores;
      } catch (fallbackError) {
        console.error('클라이언트 필터링도 실패:', fallbackError);
        throw error; // 원래 오류를 throw
      }
    }
    throw error;
  }
}

/**
 * 계정 생성 (관리자용)
 */
export async function createAccount(accountData) {
  try {
    const email = `${accountData.username}@${accountData.storeId}.local`;
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      accountData.password
    );
    
    const accountDoc = {
      ...accountData,
      uid: userCredential.user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await setDoc(doc(db, 'accounts', userCredential.user.uid), accountDoc);
    
    return { uid: userCredential.user.uid, ...accountDoc };
  } catch (error) {
    throw error;
  }
}

