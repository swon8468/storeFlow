# Re:Serve - 예약·결제·관리 통합 PWA

매장 단위의 예약/선결제/근무관리/데이터백업을 통합 관리할 수 있는 프랜차이즈형 웹앱입니다.

## 주요 기능

### 1. 예약 관리
- 시간표 뷰를 통한 예약 관리
- 전화/네이버예약 구분
- 담당 사원 기록

### 2. 선결제 관리
- 충전·차감·잔액 관리
- 거래 내역 로그 열람
- 권한 기반 차감/충전 제어

### 3. HR 모듈
- 근로계약서 전자서명
- 근무시간 등록 및 승인
- 급여명세서 자동 계산 및 생성

### 4. 자동 백업 및 복구
- 매일 22:00 자동 백업 (xlsx 파일)
- 매장별/전사 통합 백업
- 백업 복구 기능

## 기술 스택

- **Frontend**: React (JSX + CSS), Ant Design, Radix UI
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **배포**: GitHub Pages
- **PWA**: Progressive Web App 지원

## 프로젝트 구조

```
/src
  /pages          # 페이지 단위 폴더
    /auth         # 로그인, 매장 선택
    /app          # 예약, 선결제, 관리자 기능
    /hr           # 근로계약, 근무시간, 급여
    /super        # 최고관리자 전용 (/super/**)
  /services       # Firebase 로직 (db, storage, email 등)
  /assets         # Firebase config, 로고 등
  /components     # Layout, Nav, Guard, 공통 UI
  /hooks          # useSession, usePermissions
  /styles         # variables.css, globals.css
```

## 계정 구조

### 최고 관리자 (superAdmin)
- 모든 매장/데이터 접근
- 템플릿 관리
- 일괄 백업 메일 수신

### 매장 관리자 (storeAdmin)
- 소속 매장 관리
- 사원 생성/권한 설정
- 매장 데이터 백업 메일 수신

### 사원 (staff)
- 매장 선택 후 로그인 (아이디+비밀번호)
- 예약 및 선결제 실무 기능 수행

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_SUPER_BASE_PATH=/super
```

### 3. Firebase 설정
1. Firebase 콘솔에서 프로젝트 생성
2. Firestore 데이터베이스 생성
3. Storage 버킷 생성
4. Authentication 설정 (이메일/비밀번호)
5. `firestore.rules` 및 `storage.rules` 파일을 Firebase 콘솔에 배포

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 빌드
```bash
npm run build
```

## GitHub Pages 배포

### 1. vite.config.js 설정
```js
export default defineConfig({
  base: '/repository-name/', // GitHub 저장소 이름
  // ...
})
```

### 2. GitHub Actions 설정
`.github/workflows/deploy.yml` 파일 생성 (필요시)

## 데이터 모델

주요 컬렉션:
- `accounts`: 계정 정보
- `stores`: 매장 정보
- `reservations`: 예약 정보
- `reservationSources`: 예약 경로
- `prepayCustomers`: 선결제 고객
- `prepayTransactions`: 선결제 거래 내역
- `contracts`: 근로계약서
- `timesheets`: 근무시간
- `payrollRules`: 급여 규칙
- `payrolls`: 급여 명세
- `payslips`: 급여명세서
- `templates`: 템플릿
- `auditLogs`: 감사 로그

## 보안 규칙

Firestore 및 Storage 보안 규칙은 각각 `firestore.rules`와 `storage.rules` 파일에 정의되어 있습니다.

- **superAdmin**: 모든 데이터 접근/쓰기 가능
- **storeAdmin**: 동일 storeId 범위 내 생성·수정 가능
- **staff**: 본인 데이터만 접근

## Cloud Functions

다음 기능들을 Cloud Functions로 구현해야 합니다:

1. **자동 백업** (`createBackup`)
   - 매일 22:00 실행 (cron: `0 13 * * *`)
   - 매장별 xlsx 생성
   - Storage 업로드 및 메일 발송

2. **백업 복구** (`restoreBackup`)
   - xlsx 파일 검증
   - Firestore 컬렉션 재생성
   - 복구 로그 저장

3. **근로계약서 PDF 변환** (`generateContractPDF`)
   - HTML 템플릿을 PDF로 변환
   - Storage 업로드

4. **급여명세서 생성** (`generatePayslip`)
   - 급여 계산 및 PDF 생성
   - Storage 업로드

## 라이선스

MIT
