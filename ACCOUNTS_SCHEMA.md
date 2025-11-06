# Accounts 컬렉션 스키마

## 최고 관리자(superAdmin) 계정 생성 가이드

Firebase Console의 Firestore에서 `accounts` 컬렉션에 수동으로 문서를 생성할 때 필요한 필드 정보입니다.

## 필수 필드

### 1. 기본 정보
```javascript
{
  // 문서 ID: Firebase Auth의 UID (자동 생성)
  // 또는 Firebase Authentication에서 사용자 생성 후 해당 UID 사용
  
  // 필수 필드
  "role": "superAdmin",              // 역할: "superAdmin" | "storeAdmin" | "staff"
  "username": "admin",                // 사용자명 (로그인 시 사용)
  "uid": "firebase-auth-uid",         // Firebase Auth UID (문서 ID와 동일)
  
  // 선택 필드
  "name": "최고 관리자",               // 표시 이름
  "email": "admin@example.com",       // 이메일 주소 (백업 메일 발송용)
  
  // 타임스탬프 (자동 생성 권장)
  "createdAt": Timestamp,            // 생성일시 (Firebase Timestamp)
  "updatedAt": Timestamp,            // 수정일시 (Firebase Timestamp)
  
  // 최고 관리자는 storeId가 없어도 됨
  // "storeId": null,                 // superAdmin은 storeId 불필요
}
```

### 2. 최고 관리자 계정 생성 예시

#### 방법 1: Firebase Console에서 직접 생성

1. **Firebase Authentication에서 사용자 생성**
   - Firebase Console → Authentication → 사용자 추가
   - 이메일: `admin@yourdomain.com` (실제 이메일 주소)
   - 비밀번호: 설정
   - 생성된 UID 복사

2. **Firestore에서 accounts 문서 생성**
   - Firebase Console → Firestore Database
   - 컬렉션: `accounts`
   - 문서 ID: 위에서 복사한 UID
   - 필드 추가:
     ```
     role (string): superAdmin
     username (string): admin
     uid (string): [복사한 UID]
     name (string): 최고 관리자
     email (string): admin@yourdomain.com
     createdAt (timestamp): [현재 시간]
     updatedAt (timestamp): [현재 시간]
     ```

#### 방법 2: Firebase CLI로 생성 (권장)

```javascript
// Firebase Console의 Firestore 데이터베이스에서 직접 실행
// 또는 Cloud Functions를 통해 생성

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

async function createSuperAdmin() {
  const email = 'admin@yourdomain.com';
  const password = 'your-secure-password';
  
  // 1. Firebase Auth에서 사용자 생성
  const userRecord = await admin.auth().createUser({
    email: email,
    password: password,
    emailVerified: true,
  });
  
  // 2. Firestore에 accounts 문서 생성
  await admin.firestore().collection('accounts').doc(userRecord.uid).set({
    role: 'superAdmin',
    username: 'admin',
    uid: userRecord.uid,
    name: '최고 관리자',
    email: email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  console.log('Super admin created:', userRecord.uid);
}

createSuperAdmin();
```

## 다른 역할 계정 생성

### storeAdmin (매장 관리자)
```javascript
{
  "role": "storeAdmin",
  "username": "store_manager",
  "uid": "firebase-auth-uid",
  "storeId": "store_001",           // 필수: 소속 매장 ID
  "name": "매장 관리자",
  "email": "manager@store.com",
  "createdAt": Timestamp,
  "updatedAt": Timestamp,
}
```

### staff (사원)
```javascript
{
  "role": "staff",
  "username": "staff_member",
  "uid": "firebase-auth-uid",
  "storeId": "store_001",           // 필수: 소속 매장 ID
  "name": "사원 이름",
  "email": "staff@store.com",
  "permissions": [                   // 선택: 권한 배열
    "prepay:charge",                 // 선결제 충전 권한
    "prepay:deduct"                  // 선결제 차감 권한
  ],
  "createdAt": Timestamp,
  "updatedAt": Timestamp,
}
```

## 필드 설명

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `role` | string | ✅ | 계정 역할: "superAdmin", "storeAdmin", "staff" |
| `username` | string | ✅ | 로그인 사용자명 (staff/storeAdmin은 `${username}@${storeId}.local` 형식) |
| `uid` | string | ✅ | Firebase Authentication UID (문서 ID와 동일) |
| `storeId` | string | ⚠️ | 소속 매장 ID (superAdmin은 선택, storeAdmin/staff는 필수) |
| `name` | string | ❌ | 표시 이름 |
| `email` | string | ❌ | 이메일 주소 (백업 메일 발송용) |
| `permissions` | array | ❌ | 권한 배열 (예: ["prepay:charge", "prepay:deduct"]) |
| `createdAt` | Timestamp | ✅ | 생성일시 |
| `updatedAt` | Timestamp | ✅ | 수정일시 |

## 로그인 방식

### superAdmin
- 이메일: 실제 이메일 주소 (예: `admin@yourdomain.com`)
- 비밀번호: 설정한 비밀번호
- 로그인 경로: `/auth/super`

### storeAdmin / staff
- 이메일: `${username}@${storeId}.local` (예: `manager@store_001.local`)
- 비밀번호: 설정한 비밀번호
- 로그인 경로: `/auth/login` (매장 선택 후)

## 주의사항

1. **superAdmin 계정은 매우 중요하므로 강력한 비밀번호 사용**
2. **Firebase Authentication에서 이메일 인증 활성화 권장**
3. **최초 superAdmin 계정은 Firebase Console에서 직접 생성 권장**
4. **storeId는 stores 컬렉션에 존재하는 매장 ID여야 함**

