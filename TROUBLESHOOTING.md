# 로그인 문제 해결 가이드

## 현재 상황 확인

DB에 다음 정보가 확인되었습니다:
- **uid**: `2IqoDolOfJgAyvkDEfMTVqRKaJ23`
- **email**: `swon8468@gmail.com`
- **username**: `성원`
- **role**: `superAdmin`

## 확인해야 할 사항

### 1. Firebase Authentication 확인
1. Firebase Console → Authentication → 사용자 탭
2. `swon8468@gmail.com` 이메일로 사용자가 등록되어 있는지 확인
3. 사용자의 **UID**가 `2IqoDolOfJgAyvkDEfMTVqRKaJ23`인지 확인

### 2. UID 불일치 문제
만약 Firebase Authentication의 UID와 Firestore 문서 ID가 다르다면:
- Firestore 문서 ID를 Authentication UID와 동일하게 변경
- 또는 Firebase Authentication에서 새 사용자를 생성하고, Firestore 문서도 새로 생성

### 3. 로그인 테스트

브라우저 콘솔을 열고 로그인을 시도하면 다음 정보가 출력됩니다:
- `로그인 시도: swon8468@gmail.com`
- `Firebase Auth 로그인 시도: swon8468@gmail.com`
- `Firebase Auth 로그인 성공, UID: ...`
- `Firestore 문서 조회: accounts/...`
- `계정 데이터: {...}`

오류가 발생하면 상세한 오류 정보가 콘솔에 출력됩니다.

### 4. 일반적인 오류 해결

#### "존재하지 않는 이메일입니다"
→ Firebase Authentication에 사용자를 생성하세요.

#### "계정 정보를 찾을 수 없습니다"
→ Firestore의 accounts 컬렉션에 UID 문서가 있는지 확인하세요.
→ UID가 정확히 일치하는지 확인하세요.

#### "최고관리자 권한이 없습니다"
→ Firestore 문서의 role 필드가 정확히 "superAdmin"인지 확인하세요.
→ 대소문자 구분이 있습니다.

#### "Firestore 접근 권한이 없습니다"
→ Firestore 보안 규칙을 확인하세요.
→ `firestore.rules` 파일이 올바르게 배포되었는지 확인하세요.

