import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../assets/firebaseConfig';

/**
 * 공통 필드 추가 헬퍼
 */
function addCommonFields(data, isUpdate = false) {
  const now = Timestamp.now();
  return {
    ...data,
    updatedAt: now,
    ...(isUpdate ? {} : { createdAt: now }),
  };
}

/**
 * 단일 문서 조회
 */
export async function getDocument(collectionName, docId) {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

/**
 * 컬렉션 조회 (필터링, 정렬 지원)
 */
export async function getCollection(collectionName, options = {}) {
  const {
    filters = [],
    orderByField = null,
    orderByDirection = 'asc',
    limitCount = null,
  } = options;

  try {
    let q = collection(db, collectionName);

    // 필터 적용
    filters.forEach((filter) => {
      q = query(q, where(filter.field, filter.operator, filter.value));
    });

    // 정렬 적용
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderByDirection));
    }

    // 제한 적용
    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    // 인덱스 오류 발생 시 대체 방법 시도
    if (error.code === 'failed-precondition' && filters.length > 0) {
      // 인덱스가 필요한 쿼리인 경우, 더 단순한 쿼리로 시도
      try {
        let q = collection(db, collectionName);
        
        // 등호 필터만 먼저 적용
        const equalityFilters = filters.filter(f => f.operator === '==');
        equalityFilters.forEach((filter) => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });
        
        const snapshot = await getDocs(q);
        let results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        
        // 나머지 필터를 클라이언트 사이드에서 적용
        const rangeFilters = filters.filter(f => f.operator !== '==');
        rangeFilters.forEach((filter) => {
          results = results.filter((item) => {
            const value = item[filter.field];
            if (!value) return false;
            
            if (filter.operator === '>=') {
              return value.toMillis ? value.toMillis() >= filter.value.toMillis() : value >= filter.value;
            } else if (filter.operator === '<=') {
              return value.toMillis ? value.toMillis() <= filter.value.toMillis() : value <= filter.value;
            } else if (filter.operator === '>') {
              return value.toMillis ? value.toMillis() > filter.value.toMillis() : value > filter.value;
            } else if (filter.operator === '<') {
              return value.toMillis ? value.toMillis() < filter.value.toMillis() : value < filter.value;
            }
            return true;
          });
        });
        
        // 정렬 적용
        if (orderByField) {
          results.sort((a, b) => {
            const aVal = a[orderByField];
            const bVal = b[orderByField];
            
            // Timestamp 처리
            const aMillis = aVal?.toMillis ? aVal.toMillis() : aVal;
            const bMillis = bVal?.toMillis ? bVal.toMillis() : bVal;
            
            if (orderByDirection === 'asc') {
              return aMillis > bMillis ? 1 : aMillis < bMillis ? -1 : 0;
            } else {
              return aMillis < bMillis ? 1 : aMillis > bMillis ? -1 : 0;
            }
          });
        }
        
        // 제한 적용
        if (limitCount) {
          results = results.slice(0, limitCount);
        }
        
        return results;
      } catch (fallbackError) {
        console.error('대체 방법도 실패:', fallbackError);
        throw error; // 원래 오류를 throw
      }
    }
    
    throw error;
  }
}

/**
 * 문서 생성
 */
export async function createDocument(collectionName, data, docId = null) {
  try {
    const docData = addCommonFields(data);
    if (docId) {
      await setDoc(doc(db, collectionName, docId), docData);
      return docId;
    } else {
      const newDocRef = doc(collection(db, collectionName));
      await setDoc(newDocRef, docData);
      return newDocRef.id;
    }
  } catch (error) {
    console.error(`문서 생성 오류 (${collectionName}):`, error);
    throw error;
  }
}

/**
 * 문서 업데이트
 */
export async function updateDocument(collectionName, docId, data) {
  try {
    const docData = addCommonFields(data, true);
    await updateDoc(doc(db, collectionName, docId), docData);
  } catch (error) {
    console.error(`문서 업데이트 오류 (${collectionName}/${docId}):`, error);
    throw error;
  }
}

/**
 * 문서 삭제
 */
export async function deleteDocument(collectionName, docId) {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    console.error(`문서 삭제 오류 (${collectionName}/${docId}):`, error);
    throw error;
  }
}

/**
 * 배치 작업
 */
export function createBatch() {
  return writeBatch(db);
}

/**
 * 실시간 컬렉션 구독 (onSnapshot)
 */
export function subscribeCollection(collectionName, options = {}, callback) {
  const {
    filters = [],
    orderByField = null,
    orderByDirection = 'asc',
    limitCount = null,
  } = options;

  try {
    let q = collection(db, collectionName);

    // 필터 적용
    filters.forEach((filter) => {
      q = query(q, where(filter.field, filter.operator, filter.value));
    });

    // 정렬 적용
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderByDirection));
    }

    // 제한 적용
    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    // 실시간 구독
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        callback(data, null);
      },
      (error) => {
        callback(null, error);
      }
    );

    return unsubscribe;
  } catch (error) {
    callback(null, error);
    return () => {}; // 빈 unsubscribe 함수 반환
  }
}

/**
 * 예약 관련 쿼리 헬퍼
 */
export async function getReservationsByDate(storeId, date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = Timestamp.fromDate(startOfDay);
    const endTimestamp = Timestamp.fromDate(endOfDay);

    // 먼저 인덱스를 사용한 쿼리 시도
    try {
      return await getCollection('reservations', {
        filters: [
          { field: 'storeId', operator: '==', value: storeId },
          { field: 'date', operator: '>=', value: startTimestamp },
          { field: 'date', operator: '<=', value: endTimestamp },
        ],
        orderByField: 'startTime',
        orderByDirection: 'asc',
      });
    } catch (error) {
      // 인덱스 오류인 경우, startTime 정렬 없이 시도
      if (error.code === 'failed-precondition') {
        const results = await getCollection('reservations', {
          filters: [
            { field: 'storeId', operator: '==', value: storeId },
            { field: 'date', operator: '>=', value: startTimestamp },
            { field: 'date', operator: '<=', value: endTimestamp },
          ],
        });
        
        // 클라이언트 사이드에서 정렬
        return results.sort((a, b) => {
          const aTime = a.startTime?.toMillis ? a.startTime.toMillis() : (a.startTime || 0);
          const bTime = b.startTime?.toMillis ? b.startTime.toMillis() : (b.startTime || 0);
          return aTime - bTime;
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('예약 조회 오류:', error);
    throw error;
  }
}

/**
 * 선결제 고객 조회
 */
export async function getPrepayCustomers(storeId) {
  return getCollection('prepayCustomers', {
    filters: [{ field: 'storeId', operator: '==', value: storeId }],
    orderByField: 'createdAt',
    orderByDirection: 'desc',
  });
}

/**
 * 선결제 거래 내역 조회
 */
export async function getPrepayTransactions(storeId, prepayCustomerId = null) {
  const filters = [{ field: 'storeId', operator: '==', value: storeId }];
  if (prepayCustomerId) {
    filters.push({ field: 'prepayCustomerId', operator: '==', value: prepayCustomerId });
  }
  
  return getCollection('prepayTransactions', {
    filters,
    orderByField: 'createdAt',
    orderByDirection: 'desc',
    limitCount: 100,
  });
}

