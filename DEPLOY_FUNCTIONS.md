# Cloud Functions 배포 가이드

## 이메일 발송 기능을 사용하기 위한 Functions 배포

### 1. Functions 의존성 설치
```bash
cd functions
npm install
```

### 2. Gmail App Password 생성
1. Google 계정 설정 → 보안
2. 2단계 인증 활성화
3. "앱 비밀번호" 생성
4. 생성된 16자리 비밀번호 복사

### 3. Functions 환경 변수 설정

#### 방법 1: Firebase Functions Secrets (권장)
```bash
# Functions 디렉토리에서
echo "your-email@gmail.com" | firebase functions:secrets:set MAIL_USER
echo "your-16-digit-app-password" | firebase functions:secrets:set MAIL_PASSWORD
echo "noreply@reserve.com" | firebase functions:secrets:set MAIL_FROM
echo "https://your-app-url.com" | firebase functions:secrets:set APP_URL
```

#### 방법 2: .env 파일 (로컬 개발용)
`functions/.env` 파일 생성:
```
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-16-digit-app-password
MAIL_FROM=noreply@reserve.com
APP_URL=https://your-app-url.com
```

### 4. Functions 배포
```bash
# 프로젝트 루트에서
npm run firebase:deploy:functions

# 또는 Functions 디렉토리에서
cd functions
npm run deploy
```

### 5. 배포 확인
```bash
firebase functions:list
```

### 6. 로그 확인
```bash
firebase functions:log --only sendStoreCreationEmail
```

## 문제 해결

### Functions가 배포되지 않은 경우
브라우저 콘솔에 `functions/not-found` 오류가 표시됩니다.

해결:
1. Functions 디렉토리에서 `npm install` 실행
2. `npm run firebase:deploy:functions` 실행

### 이메일 발송 실패
1. Functions 로그 확인: `firebase functions:log`
2. Gmail App Password 확인
3. 환경 변수 설정 확인

### 인증 오류
Functions 호출 시 인증이 필요합니다. Firebase Auth로 로그인한 상태여야 합니다.

