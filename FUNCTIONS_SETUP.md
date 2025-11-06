# Firebase Functions 초기화 및 활성화 가이드

## Functions가 활성화되지 않은 경우

### 방법 1: Firebase CLI로 초기화 (권장)

```bash
# 프로젝트 루트에서
npx firebase init functions
```

초기화 옵션:
- **언어**: JavaScript
- **ESLint 사용**: Yes
- **의존성 설치**: Yes

### 방법 2: 수동 설정

Functions 디렉토리가 이미 있다면, 다음을 확인하세요:

1. **firebase.json 확인**
   ```json
   {
     "functions": [
       {
         "source": "functions",
         "codebase": "default"
       }
     ]
   }
   ```

2. **Functions 의존성 설치**
   ```bash
   cd functions
   npm install
   ```

3. **Functions 배포**
   ```bash
   # 프로젝트 루트에서
   npm run firebase:deploy:functions
   ```

## 배포 전 확인사항

### 1. Functions 디렉토리 구조
```
functions/
  ├── index.js
  ├── package.json
  └── node_modules/
```

### 2. package.json 확인
```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "nodemailer": "^6.9.7"
  }
}
```

### 3. 환경 변수 설정 (이메일 발송을 위해 필수)
```bash
# Gmail App Password 생성 후
firebase functions:secrets:set MAIL_USER
firebase functions:secrets:set MAIL_PASSWORD
firebase functions:secrets:set MAIL_FROM
firebase functions:secrets:set APP_URL
```

## 배포 실행

```bash
npm run firebase:deploy:functions
```

## 배포 확인

Firebase Console에서:
1. Functions 페이지로 이동
2. `sendStoreCreationEmail` 함수가 목록에 표시되는지 확인
3. 함수 상태가 "활성"인지 확인

## 문제 해결

### ESLint 오류
- `.eslintrc.js` 파일이 Node.js 환경을 인식하도록 설정되어 있는지 확인
- `env: { node: true }` 설정 확인

### 배포 실패
- Functions 디렉토리에서 `npm install` 실행
- Firebase 로그인 확인: `npx firebase login`
- 프로젝트 선택 확인: `npx firebase use storeflow-e6f53`

