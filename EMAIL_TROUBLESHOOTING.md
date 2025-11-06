# 이메일 발송 문제 해결 가이드

## 문제 진단

이메일이 발송되지 않는 경우 다음을 확인하세요:

### 1. Cloud Functions 배포 확인
```bash
# Functions 목록 확인
firebase functions:list

# Functions 로그 확인
firebase functions:log
```

### 2. Functions 의존성 설치
```bash
cd functions
npm install nodemailer
cd ..
```

### 3. Functions 배포
```bash
npm run firebase:deploy:functions
```

### 4. 환경 변수 설정
Firebase Functions v2에서는 환경 변수를 다음과 같이 설정합니다:

```bash
# Functions 디렉토리에서
firebase functions:secrets:set MAIL_USER
firebase functions:secrets:set MAIL_PASSWORD
firebase functions:secrets:set APP_URL
```

또는 `.env` 파일 사용 (Functions 디렉토리에):
```
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@reserve.com
APP_URL=https://your-app-url.com
```

### 5. Gmail App Password 설정
1. Google 계정 설정 → 보안
2. 2단계 인증 활성화
3. "앱 비밀번호" 생성
4. 생성된 16자리 비밀번호를 `MAIL_PASSWORD`에 설정

## 임시 해결 방법

Cloud Functions가 배포되지 않은 경우, 클라이언트에서 직접 이메일을 보낼 수 있는 대안을 제공할 수 있습니다:

### 방법 1: Mailgun, SendGrid 등 외부 서비스 사용
### 방법 2: 간단한 이메일 링크 생성 (비밀번호 설정 링크만)

## 디버깅

브라우저 콘솔에서 다음을 확인:
1. "이메일 발송 시도" 로그 확인
2. "이메일 발송 실패" 오류 메시지 확인
3. 오류 코드 확인:
   - `functions/not-found`: Functions가 배포되지 않음
   - `functions/unauthenticated`: 인증 오류
   - `functions/permission-denied`: 권한 오류

