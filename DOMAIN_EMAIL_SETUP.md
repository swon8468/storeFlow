# 도메인 이메일 발송 설정 가이드 (storeflow.kr)

## 옵션 1: Google Workspace 사용 (권장)

### 1. Google Workspace 설정
1. https://workspace.google.com 접속
2. storeflow.kr 도메인으로 Google Workspace 가입
3. 도메인 소유권 확인 (DNS 설정)
4. 이메일 계정 생성 (예: noreply@storeflow.kr)

### 2. App Password 생성
1. Google 계정 설정 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. 생성된 비밀번호 복사

### 3. Functions Secrets 설정
```bash
npx firebase functions:secrets:set MAIL_USER
# 입력: noreply@storeflow.kr

npx firebase functions:secrets:set MAIL_PASSWORD
# 입력: 생성한 App Password

npx firebase functions:secrets:set MAIL_FROM
# 입력: noreply@storeflow.kr

npx firebase functions:secrets:set APP_URL
# 입력: https://storeflow.kr (또는 실제 배포 URL)
```

### 4. Functions 재배포
```bash
npm run firebase:deploy:functions
```

## 옵션 2: 구글 도메인 이메일 (무료, 제한적)

### 1. 구글 도메인 이메일 설정
1. https://domains.google 접속
2. storeflow.kr 도메인 관리
3. 이메일 설정 → 이메일 전달 설정
4. 이메일 주소 생성 (예: noreply@storeflow.kr)
5. Gmail 계정에 전달 설정

### 2. Gmail SMTP 사용
- SMTP 서버: smtp.gmail.com
- 포트: 587 (TLS)
- 사용자명: noreply@storeflow.kr (또는 연결된 Gmail 계정)
- 비밀번호: Gmail App Password

## 옵션 3: 다른 SMTP 서비스 사용

### SendGrid, Mailgun, AWS SES 등
각 서비스의 SMTP 설정을 Functions에 적용합니다.

## Functions 코드 수정

도메인 이메일을 사용하려면 `functions/index.js`의 SMTP 설정을 수정해야 할 수 있습니다.

