# storeflow.kr 도메인 이메일 발송 설정

## 빠른 설정 가이드

### 1단계: Google Workspace 설정 (storeflow.kr)

#### 방법 A: Google Workspace 사용 (권장)
1. https://workspace.google.com 접속
2. "시작하기" 클릭
3. "비즈니스용" 선택
4. 도메인 입력: `storeflow.kr`
5. 도메인 소유권 확인 (DNS TXT 레코드 추가)
6. 이메일 계정 생성: `noreply@storeflow.kr`

#### 방법 B: 구글 도메인 이메일 사용 (무료)
1. https://domains.google 접속
2. storeflow.kr 도메인 선택
3. 이메일 설정 → 이메일 전달
4. 이메일 주소 생성: `noreply@storeflow.kr`
5. Gmail 계정에 전달 설정

### 2단계: App Password 생성

1. Google 계정 설정: https://myaccount.google.com
2. 보안 → 2단계 인증 활성화
3. 앱 비밀번호 생성: https://myaccount.google.com/apppasswords
4. 앱 선택: "메일"
5. 기기 선택: "기타(맞춤 이름)" → "Re:Serve Functions"
6. 생성된 16자리 비밀번호 복사

### 3단계: Firebase Functions Secrets 설정

```bash
# 프로젝트 루트에서 실행

# 이메일 주소 (Google Workspace 또는 구글 도메인 이메일)
npx firebase functions:secrets:set MAIL_USER
# 입력: noreply@storeflow.kr

# App Password
npx firebase functions:secrets:set MAIL_PASSWORD
# 입력: xxxxxxyyyyyyzzzz (생성한 16자리 비밀번호)

# 발신자 이메일 (보통 MAIL_USER와 동일)
npx firebase functions:secrets:set MAIL_FROM
# 입력: noreply@storeflow.kr

# 앱 URL
npx firebase functions:secrets:set APP_URL
# 입력: https://storeflow.kr (실제 배포 URL)
```

### 4단계: Functions 재배포

Secrets를 설정한 후 Functions를 재배포해야 합니다:

```bash
npm run firebase:deploy:functions
```

### 5단계: 테스트

1. 매장 생성 다시 시도
2. `noreply@storeflow.kr`에서 이메일 발송 확인
3. Functions 로그 확인:
   ```bash
   npx firebase functions:log --only sendStoreCreationEmail --limit 10
   ```

## 다른 SMTP 서비스 사용 시

### SendGrid 예시
```bash
npx firebase functions:secrets:set MAIL_HOST
# 입력: smtp.sendgrid.net

npx firebase functions:secrets:set MAIL_PORT
# 입력: 587

npx firebase functions:secrets:set MAIL_USER
# 입력: apikey

npx firebase functions:secrets:set MAIL_PASSWORD
# 입력: SendGrid API Key
```

### Mailgun 예시
```bash
npx firebase functions:secrets:set MAIL_HOST
# 입력: smtp.mailgun.org

npx firebase functions:secrets:set MAIL_PORT
# 입력: 587

npx firebase functions:secrets:set MAIL_USER
# 입력: postmaster@mg.storeflow.kr

npx firebase functions:secrets:set MAIL_PASSWORD
# 입력: Mailgun SMTP Password
```

## DNS 설정 (Google Workspace 사용 시)

### MX 레코드 추가
```
타입: MX
호스트: @
우선순위: 1
값: aspmx.l.google.com
```

Google Workspace 설정 시 제공되는 모든 MX 레코드를 추가해야 합니다.

## 문제 해결

### "인증 실패" 오류
- App Password가 올바른지 확인
- 2단계 인증이 활성화되어 있는지 확인
- Google Workspace 계정의 경우 관리자 권한 확인

### "도메인 인증 실패" 오류
- DNS 설정이 올바른지 확인
- 도메인 소유권 확인 완료 여부 확인

### 이메일이 스팸으로 분류됨
- SPF 레코드 추가
- DKIM 설정
- DMARC 정책 설정

