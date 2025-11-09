# Firebase 프로젝트 분리 설정 가이드

## 개요

개발용과 프로덕션용 Firebase 프로젝트를 분리하여 사용합니다.

- **개발용 Firebase 프로젝트**: 로컬 개발 및 `dev` 브랜치에서 사용
- **프로덕션용 Firebase 프로젝트**: `main` 브랜치 배포 및 실제 서비스에서 사용

## 설정 방법

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에서 두 개의 프로젝트 생성:
   - `storeflow-dev` (개발용)
   - `storeflow-prod` (프로덕션용)

2. 각 프로젝트에서 Web 앱 추가 후 설정 값 복사

### 2. 로컬 개발 환경 설정

`.env.development` 파일을 생성하고 개발용 Firebase 설정을 입력하세요:

```bash
# .env.development 파일 생성
cp .env.example .env.development
```

`.env.development` 파일 내용:
```env
VITE_FIREBASE_API_KEY=개발용_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=개발용_프로젝트_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=개발용_프로젝트_ID
VITE_FIREBASE_STORAGE_BUCKET=개발용_프로젝트_ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=개발용_SENDER_ID
VITE_FIREBASE_APP_ID=개발용_APP_ID
```

또는 `.env.local` 파일을 사용할 수도 있습니다 (`.env.development`보다 우선순위가 높음).

### 3. 프로덕션 환경 설정

#### GitHub Actions를 사용하는 경우 (권장)

GitHub 저장소의 Settings → Secrets and variables → Actions에서 다음 Secrets를 추가하세요:

- `VITE_FIREBASE_API_KEY` (프로덕션용)
- `VITE_FIREBASE_AUTH_DOMAIN` (프로덕션용)
- `VITE_FIREBASE_PROJECT_ID` (프로덕션용)
- `VITE_FIREBASE_STORAGE_BUCKET` (프로덕션용)
- `VITE_FIREBASE_MESSAGING_SENDER_ID` (프로덕션용)
- `VITE_FIREBASE_APP_ID` (프로덕션용)

GitHub Actions는 `main` 브랜치에 푸시할 때 자동으로 이 Secrets를 사용하여 빌드합니다.

#### 수동 배포를 사용하는 경우

`.env.production` 파일을 생성하고 프로덕션용 Firebase 설정을 입력하세요:

```bash
# .env.production 파일 생성
cp .env.example .env.production
```

`.env.production` 파일 내용:
```env
VITE_FIREBASE_API_KEY=프로덕션용_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=프로덕션용_프로젝트_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=프로덕션용_프로젝트_ID
VITE_FIREBASE_STORAGE_BUCKET=프로덕션용_프로젝트_ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=프로덕션용_SENDER_ID
VITE_FIREBASE_APP_ID=프로덕션용_APP_ID
```

## 환경 변수 우선순위

Vite는 다음 순서로 환경 변수를 로드합니다:

1. `.env.production.local` (프로덕션 빌드, 로컬에서만)
2. `.env.local` (모든 환경, 로컬에서만)
3. `.env.production` (프로덕션 빌드)
4. `.env.development` (개발 모드)
5. `.env` (모든 환경)

## 빌드 모드

- **개발 모드** (`npm run dev`): `.env.development` 사용
- **프로덕션 빌드** (`npm run build`): `.env.production` 사용

## 주의사항

- ⚠️ `.env.development`와 `.env.production` 파일은 `.gitignore`에 포함되어 있어 GitHub에 푸시되지 않습니다.
- ✅ `.env.example` 파일은 템플릿으로 GitHub에 포함됩니다.
- ✅ GitHub Actions를 사용하는 경우 Secrets를 통해 프로덕션 설정을 관리합니다.

## Firebase 프로젝트별 설정

### 개발용 프로젝트 (`storeflow-dev`)
- Firestore 규칙: 개발 중인 규칙 테스트
- Storage 규칙: 개발 중인 규칙 테스트
- Functions: 개발/테스트용

### 프로덕션용 프로젝트 (`storeflow-prod`)
- Firestore 규칙: 최종 운영 규칙
- Storage 규칙: 최종 운영 규칙
- Functions: 운영용

## 문제 해결

### 환경 변수가 적용되지 않는 경우

1. 파일 이름 확인: `.env.development` 또는 `.env.production`
2. 변수 이름 확인: `VITE_` 접두사 필수
3. 개발 서버 재시작: `npm run dev`
4. 빌드 캐시 삭제: `rm -rf dist node_modules/.vite`

