# 매장 생성 기능 가이드

## 개요
최고 관리자가 매장을 생성할 때 다음 정보를 입력합니다:
- **매장명**: 매장의 이름
- **매장 로고**: 이미지 파일 (선택)
- **사업자 등록번호**: xxx-xx-xxxxx 형식
- **담당자 이메일**: 중복 불가, 비밀번호 설정 이메일 발송 대상

## 매장 생성 프로세스

### 1. 매장 정보 입력
- `/super/stores` 페이지에서 "매장 추가" 버튼 클릭
- 필수 정보 입력:
  - 매장명
  - 사업자 등록번호 (자동으로 xxx-xx-xxxxx 형식으로 포맷팅)
  - 담당자 이메일 (중복 체크)
  - 매장 로고 (선택)

### 2. 자동 처리
- 매장 로고가 있으면 Firebase Storage에 업로드
- Firestore에 매장 정보 저장
- 담당자 이메일로 이메일 발송

### 3. 이메일 발송
담당자에게 다음 두 가지 이메일이 발송됩니다:
1. **매장 생성 완료 안내**
   - 매장 정보 요약
   - 비밀번호 설정 링크 포함
2. **비밀번호 설정 링크**
   - 클릭 시 `/auth/set-password` 페이지로 이동
   - 새 비밀번호 설정 가능

## Cloud Functions 설정

### 1. Functions 의존성 설치
```bash
cd functions
npm install nodemailer
```

### 2. 환경 변수 설정
Firebase Functions에 환경 변수 설정:
```bash
firebase functions:config:set mail.user="your-email@gmail.com"
firebase functions:config:set mail.password="your-app-password"
firebase functions:config:set mail.from="noreply@reserve.com"
firebase functions:config:set app.url="https://your-app-url.com"
```

### 3. Functions 배포
```bash
npm run firebase:deploy:functions
```

## 데이터 모델

### Stores 컬렉션
```javascript
{
  name: "매장명",
  businessNumber: "123-45-67890",
  managerEmail: "manager@store.com",
  logoUrl: "https://storage.../logo.png",
  status: "active",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 이메일 템플릿

이메일에는 다음 정보가 포함됩니다:
- 매장명
- 사업자 등록번호
- 담당자 이메일
- 비밀번호 설정 링크 (24시간 유효)
- 매장 로고 (있는 경우)

## 보안 고려사항

1. **담당자 이메일 중복 방지**
   - Firestore에서 `managerEmail` 필드로 중복 체크
   - 동일 이메일로 여러 매장 생성 불가

2. **비밀번호 설정 링크**
   - 토큰 기반 인증 (추후 구현 권장)
   - 24시간 유효기간
   - 일회용 링크

3. **매장 로고**
   - 이미지 파일만 허용
   - 2MB 이하 제한
   - Firebase Storage에 저장

## 다음 단계

1. Cloud Functions 배포 및 환경 변수 설정
2. 이메일 발송 테스트
3. 비밀번호 설정 페이지 구현 완료
4. 매장 관리자 계정 자동 생성 (선택)

