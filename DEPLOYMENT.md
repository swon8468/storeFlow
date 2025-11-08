# GitHub Pages 배포 가이드

## 1. GitHub 저장소 설정

### GitHub Pages 활성화
1. GitHub 저장소로 이동: `https://github.com/swon8468/storeFlow`
2. **Settings** → **Pages** 메뉴로 이동
3. **Source** 섹션에서:
   - **Deploy from a branch** 선택
   - **Branch**: `gh-pages` 선택 (또는 GitHub Actions 사용 시 자동 생성됨)
   - **Folder**: `/ (root)` 선택
4. **Custom domain** 섹션에 `storeflow.kr` 입력
5. **Enforce HTTPS** 체크박스 활성화 (도메인 연결 후)

### GitHub Actions 권한 설정
1. **Settings** → **Actions** → **General**
2. **Workflow permissions** 섹션에서:
   - **Read and write permissions** 선택
   - **Allow GitHub Actions to create and approve pull requests** 체크

## 2. GitHub Secrets 설정 (환경 변수)

Firebase 설정을 위한 환경 변수를 GitHub Secrets에 추가해야 합니다:

1. **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭하여 다음 변수들을 추가:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

각 변수의 값은 Firebase 콘솔의 프로젝트 설정에서 확인할 수 있습니다.

## 3. 도메인 DNS 설정

`storeflow.kr` 도메인의 DNS 레코드를 다음과 같이 설정해야 합니다:

### A 레코드 (IPv4)
```
Type: A
Name: @ (또는 storeflow.kr)
Value: 
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
```

### CNAME 레코드 (서브도메인 사용 시)
```
Type: CNAME
Name: www
Value: swon8468.github.io
```

### 또는 AAAA 레코드 (IPv6)
```
Type: AAAA
Name: @
Value:
  2606:50c0:8000::153
  2606:50c0:8001::153
  2606:50c0:8002::153
  2606:50c0:8003::153
```

**참고**: GitHub Pages의 IP 주소는 변경될 수 있으므로, 최신 IP 주소는 [GitHub Pages 문서](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)를 확인하세요.

## 4. 배포 프로세스

### 자동 배포
- `main` 브랜치에 푸시하면 자동으로 GitHub Actions가 실행되어 배포됩니다.
- 배포 상태는 **Actions** 탭에서 확인할 수 있습니다.

### 수동 배포
1. 로컬에서 빌드:
   ```bash
   npm run build
   ```

2. `dist` 폴더의 내용을 `gh-pages` 브랜치에 푸시 (선택사항)

## 5. 배포 확인

배포가 완료되면 다음 주소로 접속할 수 있습니다:
- https://storeflow.kr
- https://www.storeflow.kr (CNAME 설정 시)

## 6. 문제 해결

### DNS 전파 확인
DNS 변경사항이 전파되는 데 최대 48시간이 걸릴 수 있습니다. 다음 명령어로 확인:
```bash
dig storeflow.kr
# 또는
nslookup storeflow.kr
```

### HTTPS 인증서
도메인 연결 후 GitHub이 자동으로 SSL 인증서를 발급합니다. 인증서 발급까지 몇 분에서 몇 시간이 걸릴 수 있습니다.

### 빌드 오류
GitHub Actions의 빌드 로그를 확인하여 오류를 진단할 수 있습니다:
- **Actions** 탭 → 최근 워크플로우 실행 → **build** 작업 클릭

