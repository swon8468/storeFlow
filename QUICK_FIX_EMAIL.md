# 이메일 발송 문제 빠른 해결 가이드

## 문제
매장 생성은 되지만 이메일이 발송되지 않습니다.

## 해결 방법

### 1단계: Functions 의존성 확인 및 설치
```bash
cd functions
npm install
```

### 2단계: Functions 배포
```bash
# 프로젝트 루트에서
npm run firebase:deploy:functions
```

### 3단계: 환경 변수 설정 (중요!)

Firebase Functions v2에서는 Secrets를 사용합니다:

```bash
# Functions 디렉토리에서
firebase functions:secrets:set MAIL_USER
# 프롬프트가 나타나면 이메일 입력: your-email@gmail.com

firebase functions:secrets:set MAIL_PASSWORD  
# 프롬프트가 나타나면 Gmail App Password 입력: xxxx xxxx xxxx xxxx

firebase functions:secrets:set MAIL_FROM
# 프롬프트가 나타나면: noreply@reserve.com

firebase functions:secrets:set APP_URL
# 프롬프트가 나타나면: https://your-app-url.com (또는 http://localhost:5173)
```

### 4단계: Functions 코드에서 Secrets 사용하도록 수정

`functions/index.js`에서 Secrets를 사용하도록 수정되었습니다. 
배포 후 다시 시도하세요.

### 5단계: Gmail App Password 생성

1. https://myaccount.google.com 접속
2. 보안 → 2단계 인증 활성화
3. "앱 비밀번호" 검색
4. "메일" 및 "기타(맞춤 이름)" 선택 → "Re:Serve" 입력
5. 생성된 16자리 비밀번호 복사 (공백 제거)
6. 위의 `MAIL_PASSWORD` 설정 시 사용

## 배포 후 테스트

1. 매장 생성 다시 시도
2. 브라우저 콘솔 확인:
   - "이메일 발송 시도" 로그 확인
   - 오류 메시지 확인
3. Functions 로그 확인:
   ```bash
   firebase functions:log --only sendStoreCreationEmail
   ```

## 임시 해결책

Functions 배포가 어려운 경우, 매장 생성 후 수동으로 담당자에게 연락하여 비밀번호 설정 링크를 제공할 수 있습니다.

링크 형식:
```
https://your-app-url.com/auth/set-password?email=담당자이메일&storeId=매장ID&token=타임스탬프
```

