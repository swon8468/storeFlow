import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../assets/firebaseConfig';

export function useSession() {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState(() => {
    // 초기값: localStorage 또는 null
    return localStorage.getItem('selectedStoreId');
  });

  useEffect(() => {
    // Firebase Auth 상태 확인
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // 계정 정보 가져오기
        try {
          const accountDoc = await getDoc(doc(db, 'accounts', firebaseUser.uid));
          if (accountDoc.exists()) {
            const accountData = { id: accountDoc.id, ...accountDoc.data() };
            setAccount(accountData);
            
            // staff 또는 storeAdmin 계정의 경우 storeId 설정 및 store 정보 로드
            if ((accountData.role === 'staff' || accountData.role === 'storeAdmin')) {
              if (accountData.storeId) {
                console.log('Setting storeId from account:', accountData.storeId);
                setStoreId(accountData.storeId);
                localStorage.setItem('selectedStoreId', accountData.storeId);
                
                // store 정보 로드
                try {
                  const storeDoc = await getDoc(doc(db, 'stores', accountData.storeId));
                  if (storeDoc.exists()) {
                    setStore({ id: storeDoc.id, ...storeDoc.data() });
                  }
                } catch (error) {
                  console.error('Error loading store:', error);
                }
              } else {
                // localStorage에 저장된 storeId가 있으면 사용
                const savedStoreId = localStorage.getItem('selectedStoreId');
                if (savedStoreId) {
                  console.log('Using saved storeId from localStorage:', savedStoreId);
                  setStoreId(savedStoreId);
                  
                  // store 정보 로드
                  try {
                    const storeDoc = await getDoc(doc(db, 'stores', savedStoreId));
                    if (storeDoc.exists()) {
                      setStore({ id: storeDoc.id, ...storeDoc.data() });
                    }
                  } catch (error) {
                    console.error('Error loading store:', error);
                  }
                } else {
                  console.error('storeId is missing in account data and localStorage:', accountData);
                }
              }
            }
          } else {
            console.error('Account document does not exist for uid:', firebaseUser.uid);
          }
        } catch (error) {
          console.error('Error fetching account:', error);
        }
      } else {
        // Firebase Auth에 로그인하지 않은 경우, staff 세션 확인
        const staffSession = localStorage.getItem('staffSession');
        if (staffSession) {
          try {
            const sessionData = JSON.parse(staffSession);
            const accountDoc = await getDoc(doc(db, 'accounts', sessionData.uid));
            if (accountDoc.exists()) {
              const accountData = { id: accountDoc.id, ...accountDoc.data() };
              setAccount(accountData);
              setStoreId(sessionData.storeId);
              
              // store 정보 로드
              try {
                const storeDoc = await getDoc(doc(db, 'stores', sessionData.storeId));
                if (storeDoc.exists()) {
                  setStore({ id: storeDoc.id, ...storeDoc.data() });
                }
              } catch (error) {
                console.error('Error loading store:', error);
              }
              
              // Firebase Auth 없이도 사용 가능하도록 설정
              setUser({ uid: sessionData.uid });
            } else {
              // 세션 데이터가 유효하지 않으면 제거
              localStorage.removeItem('staffSession');
              localStorage.removeItem('selectedStoreId');
            }
          } catch (error) {
            console.error('Error loading staff session:', error);
            localStorage.removeItem('staffSession');
            localStorage.removeItem('selectedStoreId');
          }
        } else {
          setUser(null);
          setAccount(null);
          setStore(null);
          setStoreId(null);
          localStorage.removeItem('selectedStoreId');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStoreId = (newStoreId) => {
    setStoreId(newStoreId);
    if (newStoreId) {
      localStorage.setItem('selectedStoreId', newStoreId);
    } else {
      localStorage.removeItem('selectedStoreId');
    }
  };

  // Firebase Auth 또는 staff 세션 확인
  const isAuthenticated = !!user || !!localStorage.getItem('staffSession');

  // disabledFeatures 계산
  const disabledFeatures = store?.disabledFeatures || {};
  const isFeatureDisabled = (feature) => {
    const featureMap = {
      'reservations': 'reservations',
      'prepay': 'prepay',
      'hr': 'hr',
      'payroll': 'payroll',
    };
    return disabledFeatures[featureMap[feature]] === true;
  };

  return {
    user,
    account,
    store,
    loading,
    storeId,
    updateStoreId,
    isAuthenticated,
    disabledFeatures,
    isFeatureDisabled,
  };
}

