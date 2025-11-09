# 브랜치 사용 가이드

## 브랜치 구조

```
dev → main → gh-pages
```

### 브랜치별 역할

- **`dev`**: 실험/기능 추가용
  - 새로운 기능 개발 및 테스트
  - 소스 코드만 GitHub에 푸시 (배포되지 않음)
  - 실수로 `npm run deploy`를 실행해도 `main` 브랜치에 영향 없음

- **`main`**: 운영 코드
  - 안정화된 프로덕션 코드
  - `dev`에서 테스트 완료된 코드만 머지
  - `main` 브랜치에 푸시하면 자동으로 GitHub Pages에 배포됨

- **`gh-pages`**: 최종 빌드된 배포 결과
  - `main` 브랜치에서만 자동 생성/업데이트
  - GitHub Pages 배포용 빌드 결과물만 포함

## 작업 흐름

### 1. 새 기능 개발 시

```bash
# dev 브랜치로 전환
git checkout dev

# 기능 개발 및 커밋
git add .
git commit -m "새 기능 추가"

# GitHub에 푸시 (배포되지 않음)
git push origin dev
```

### 2. 운영 배포 시

```bash
# main 브랜치로 전환
git checkout main

# dev 브랜치의 변경사항 머지
git merge dev

# main 브랜치에 푸시 (자동 배포됨)
git push origin main
```

### 3. 수동 배포 (필요 시)

```bash
# main 브랜치에서만 실행
git checkout main
npm run deploy:main
```

## 주의사항

- ⚠️ `dev` 브랜치에서는 `npm run deploy`를 실행해도 `main` 브랜치에 영향 없음
- ✅ `main` 브랜치에 푸시하면 자동으로 GitHub Pages에 배포됨
- ✅ GitHub Actions는 `main` 브랜치에서만 작동하도록 설정됨

