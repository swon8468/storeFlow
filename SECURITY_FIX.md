# Firebase API 키 보안 강화 가이드

## 🚨 긴급 조치 사항

Google Cloud Platform에서 API 키가 GitHub에 공개적으로 노출되었다는 경고를 받았습니다.

## 즉시 해야 할 작업

### 1. Firebase Console에서 API 키 제한 설정 (최우선)

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 `storeFlow (id: storeflow-e6f53)` 선택
3. **API 및 서비스** → **사용자 인증 정보** 이동
4. 노출된 API 키 `AlzaSyDSTI6Xgx0xH3R07qodpFu-jflH648bK8g` 찾기
5. **API 키 제한사항** 설정:
   - **애플리케이션 제한사항**: 
     - ✅ **HTTP 리퍼러(웹사이트)** 선택
     - 허용된 리퍼러 추가:
       - `https://storeflow.kr/*`
       - `https://*.storeflow.kr/*`
       - `http://localhost:*` (개발용)
   - **API 제한사항**:
     - ✅ **키를 제한** 선택
     - 다음 API만 선택:
       - Firebase Authentication API
       - Cloud Firestore API
       - Cloud Storage API
       - Firebase Cloud Messaging API (필요시)

### 2. API 키 교체 (권장)

보안을 위해 노출된 API 키를 교체하는 것을 권장합니다:

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스** → **사용자 인증 정보**
3. 노출된 API 키 선택 → **키 다시 만들기** 클릭
4. 새 API 키 생성 후 위의 제한사항 설정
5. GitHub Secrets 업데이트:
   - GitHub 저장소 → Settings → Secrets and variables → Actions
   - `VITE_FIREBASE_API_KEY` 값을 새 키로 업데이트
6. 로컬 `.env` 및 `.env.production` 파일도 업데이트

### 3. GitHub에서 빌드 파일 확인

빌드된 파일이 `main` 브랜치에 커밋되어 있는지 확인:

```bash
# 빌드 파일이 main 브랜치에 있는지 확인
git ls-files | grep -E "dist/|assets/index-.*\.js"

# 있다면 제거
git rm -r --cached dist/  # 캐시에서만 제거 (로컬 파일은 유지)
git commit -m "Remove build files from repository"
git push origin main
```

## 장기 보안 조치

### 1. Firebase API 키는 클라이언트에 노출됨

**중요**: Firebase Web SDK를 사용하는 경우, API 키는 클라이언트 측 JavaScript에 포함됩니다. 
이는 **정상적인 동작**이지만, 다음 보안 조치가 필수입니다:

- ✅ **API 키 제한사항 설정** (위 참조)
- ✅ **Firestore 보안 규칙** 사용
- ✅ **Storage 보안 규칙** 사용
- ✅ **Authentication** 필수

### 2. 환경 변수 관리

- ✅ `.env` 파일은 절대 Git에 커밋하지 않음 (`.gitignore`에 포함됨)
- ✅ `.env.production` 파일도 Git에 커밋하지 않음
- ✅ GitHub Secrets를 사용하여 프로덕션 배포

### 3. 빌드 파일 관리

- ✅ `dist` 폴더는 `.gitignore`에 포함됨
- ✅ `gh-pages` 브랜치에는 빌드 결과만 포함 (소스 코드 없음)
- ✅ `main` 브랜치에는 소스 코드만 포함 (빌드 파일 없음)

## 보안 체크리스트

- [ ] Firebase Console에서 API 키 제한사항 설정 완료
- [ ] HTTP 리퍼러 제한 설정 (storeflow.kr만 허용)
- [ ] API 제한 설정 (필요한 API만 허용)
- [ ] 노출된 API 키 교체 (선택사항이지만 권장)
- [ ] GitHub Secrets 업데이트 (키 교체한 경우)
- [ ] 로컬 `.env` 파일 업데이트 (키 교체한 경우)
- [ ] `main` 브랜치에 빌드 파일이 있는지 확인 및 제거

## 참고

- Firebase API 키는 클라이언트에 노출되는 것이 정상입니다
- 보안은 **API 키 제한사항**과 **Firestore/Storage 규칙**으로 보장됩니다
- API 키만으로는 데이터에 접근할 수 없으며, 인증된 사용자만 접근 가능합니다

