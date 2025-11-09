# Firebase 프로젝트 분리 설정 가이드

## 개요

개발용과 프로덕션용 Firebase 프로젝트를 분리하여 사용합니다.

- **개발용 Firebase 프로젝트**: 로컬 개발 및 `dev` 브랜치에서 사용 (`.env` 파일)
- **프로덕션용 Firebase 프로젝트**: `main` 브랜치 배포 및 실제 서비스에서 사용 (`.env.production` 파일 또는 GitHub Secrets)

## 설정 방법

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에서 두 개의 프로젝트 생성:
   - `storeflow-dev` (개발용)
   - `storeflow-prod` (프로덕션용)

2. 각 프로젝트에서 Web 앱 추가 후 설정 값 복사

### 2. 로컬 개발 환경 설정

`.env` 파일을 생성하고 개발용 Firebase 설정을 입력하세요:

```bash
# .env.example을 복사하여 생성
cp .env.example .env
```

`.env` 파일 내용 (개발용 설정):
```env
VITE_FIREBASE_API_KEY=개발용_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=개발용_프로젝트_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=개발용_프로젝트_ID
VITE_FIREBASE_STORAGE_BUCKET=개발용_프로젝트_ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=개발용_SENDER_ID
VITE_FIREBASE_APP_ID=개발용_APP_ID
```

이 파일은 `npm run dev` 실행 시 사용됩니다.

### 3. 프로덕션 환경 설정

#### 방법 1: GitHub Actions 사용 (권장)

GitHub 저장소의 Settings → Secrets and variables → Actions에서 다음 Secrets를 추가하세요:

- `VITE_FIREBASE_API_KEY` (프로덕션용)
- `VITE_FIREBASE_AUTH_DOMAIN` (프로덕션용)
- `VITE_FIREBASE_PROJECT_ID` (프로덕션용)
- `VITE_FIREBASE_STORAGE_BUCKET` (프로덕션용)
- `VITE_FIREBASE_MESSAGING_SENDER_ID` (프로덕션용)
- `VITE_FIREBASE_APP_ID` (프로덕션용)

GitHub Actions는 `main` 브랜치에 푸시할 때 자동으로 이 Secrets를 사용하여 빌드합니다.

#### 방법 2: 로컬에서 프로덕션 빌드 테스트

`.env.production` 파일을 생성하고 프로덕션용 Firebase 설정을 입력하세요:

```bash
# .env.production.example을 복사하여 생성
cp .env.production.example .env.production
```

그리고 `.env.production` 파일을 열어서 프로덕션용 Firebase 프로젝트의 실제 값으로 변경하세요:

```env
# 프로덕션용 Firebase API Key
VITE_FIREBASE_API_KEY=your_production_api_key_here

# 프로덕션용 Firebase Auth Domain
VITE_FIREBASE_AUTH_DOMAIN=your_production_project_id.firebaseapp.com

# 프로덕션용 Firebase Project ID
VITE_FIREBASE_PROJECT_ID=your_production_project_id

# 프로덕션용 Firebase Storage Bucket
VITE_FIREBASE_STORAGE_BUCKET=your_production_project_id.appspot.com

# 프로덕션용 Firebase Messaging Sender ID
VITE_FIREBASE_MESSAGING_SENDER_ID=your_production_sender_id

# 프로덕션용 Firebase App ID
VITE_FIREBASE_APP_ID=your_production_app_id
```

이 파일은 `npm run build` 실행 시 사용됩니다.

## 환경 변수 우선순위

Vite는 다음 순서로 환경 변수를 로드합니다:

1. `.env.production.local` (프로덕션 빌드, 로컬에서만, Git에 커밋하지 않음)
2. `.env.local` (모든 환경, 로컬에서만, Git에 커밋하지 않음)
3. `.env.production` (프로덕션 빌드 시 사용)
4. `.env.development` (개발 모드 시 사용, 없으면 `.env` 사용)
5. `.env` (기본값, 개발 모드에서 사용)

## 빌드 모드

- **개발 모드** (`npm run dev`): `.env` 파일 사용 (기본값)
- **프로덕션 빌드** (`npm run build`): `.env.production` 파일 또는 GitHub Secrets 사용

## 주의사항

- ⚠️ `.env`와 `.env.production` 파일은 `.gitignore`에 포함되어 있어 GitHub에 푸시되지 않습니다.
- ✅ `.env.example` 파일은 템플릿으로 GitHub에 포함됩니다.
- ✅ GitHub Actions를 사용하는 경우 Secrets를 통해 프로덕션 설정을 관리합니다.
- ✅ 로컬에서 개발할 때는 `.env` 파일만 있으면 됩니다.

## 🔒 보안 중요 사항

**Firebase API 키는 클라이언트 측 JavaScript에 포함됩니다.** 이는 정상적인 동작이지만, 다음 보안 조치가 **필수**입니다:

1. **Firebase Console에서 API 키 제한사항 설정**:
   - HTTP 리퍼러 제한: `https://storeflow.kr/*`만 허용
   - API 제한: 필요한 Firebase API만 허용
   - 자세한 내용은 `SECURITY_FIX.md` 참고

2. **Firestore/Storage 보안 규칙 사용**:
   - API 키만으로는 데이터 접근 불가
   - 인증된 사용자만 접근 가능하도록 규칙 설정

3. **빌드 파일 관리**:
   - `dist` 폴더는 Git에 커밋하지 않음
   - `gh-pages` 브랜치에는 배포용 빌드만 포함

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

1. 파일 이름 확인: `.env` (개발용) 또는 `.env.production` (프로덕션용)
2. 변수 이름 확인: `VITE_` 접두사 필수
3. 개발 서버 재시작: `npm run dev`
4. 빌드 캐시 삭제: `rm -rf dist node_modules/.vite`
5. 프로젝트 루트에 파일이 있는지 확인 (`/src` 폴더가 아님)

