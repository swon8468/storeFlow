# 이메일 발송을 위한 환경 변수 설정

## Functions 배포 완료 ✅

Functions가 성공적으로 배포되었습니다:
- `sendStoreCreationEmail` - 매장 생성 완료 이메일 발송
- `checkEmailDuplicate` - 이메일 중복 확인

## 다음 단계: 환경 변수 설정

### 1. Gmail App Password 생성

1. Google 계정 설정 접속: https://myaccount.google.com
2. **보안** 탭 클릭
3. **2단계 인증** 활성화 (필수)
4. **앱 비밀번호** 검색 또는 https://myaccount.google.com/apppasswords
5. 앱 선택: **메일**
6. 기기 선택: **기타(맞춤 이름)** → "Re:Serve Functions" 입력
7. **생성** 클릭
8. 생성된 **16자리 비밀번호** 복사 (공백 제거)

### 2. Firebase Functions Secrets 설정

Firebase Functions v2에서는 Secrets를 사용합니다:

```bash
# 프로젝트 루트에서 실행
echo "your-email@gmail.com" | npx firebase functions:secrets:set MAIL_USER
echo "your-16-digit-app-password" | npx firebase functions:secrets:set MAIL_PASSWORD
echo "noreply@reserve.com" | npx firebase functions:secrets:set MAIL_FROM
echo "http://localhost:5173" | npx firebase functions:secrets:set APP_URL
```

또는 인터랙티브 모드:

```bash
npx firebase functions:secrets:set MAIL_USER
# 프롬프트에 이메일 입력: your-email@gmail.com

npx firebase functions:secrets:set MAIL_PASSWORD
# 프롬프트에 App Password 입력: xxxxxxyyyyyyzzzz (16자리)

npx firebase functions:secrets:set MAIL_FROM
# 프롬프트에 발신자 이메일 입력: noreply@reserve.com

npx firebase functions:secrets:set APP_URL
# 프롬프트에 앱 URL 입력: http://localhost:5173 (개발) 또는 https://your-domain.com (프로덕션)
```

### 3. Functions 코드에서 Secrets 사용

`functions/index.js`에서 Secrets를 읽도록 수정:

```javascript
// Secrets 사용 예시 (현재 코드에 이미 구현됨)
const mailUser = process.env.MAIL_USER;
const mailPassword = process.env.MAIL_PASSWORD;
```

### 4. Secrets 확인

```bash
npx firebase functions:secrets:access MAIL_USER
```

## 배포 후 테스트

1. 매장 생성 다시 시도
2. 브라우저 콘솔 확인:
   - "이메일 발송 시도" 로그 확인
   - 오류 메시지 확인
3. Functions 로그 확인:
   ```bash
   npx firebase functions:log --only sendStoreCreationEmail
   ```

## 문제 해결

### "이메일 설정이 완료되지 않았습니다" 오류
→ Secrets가 설정되지 않았거나 Functions가 재배포되지 않았습니다.
→ Secrets 설정 후 Functions 재배포 필요합니다.

### "인증 실패" 오류
→ Gmail App Password가 올바르지 않습니다.
→ 새 App Password 생성 후 다시 설정하세요.

### 이메일이 발송되지 않음
→ Functions 로그 확인:
```bash
npx firebase functions:log --only sendStoreCreationEmail --limit 50
```

