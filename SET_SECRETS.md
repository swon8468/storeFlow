# Firebase Functions Secrets 설정 가이드

## 올바른 명령어

### ❌ 잘못된 명령어
```bash
firebase function:secrets:set swon8468@storeflow.kr  # function (단수) - 잘못됨
```

### ✅ 올바른 명령어
```bash
npx firebase functions:secrets:set MAIL_USER  # functions (복수) - 올바름
```

## Secrets 설정 방법

### 방법 1: 인터랙티브 모드 (권장)
```bash
# 프로젝트 루트에서 실행
npx firebase functions:secrets:set MAIL_USER
# 프롬프트에 값 입력: noreply@storeflow.kr
# Enter 키 입력

npx firebase functions:secrets:set MAIL_PASSWORD
# 프롬프트에 값 입력: xxxxxxyyyyyyzzzz (16자리 App Password)
# Enter 키 입력

npx firebase functions:secrets:set MAIL_FROM
# 프롬프트에 값 입력: noreply@storeflow.kr
# Enter 키 입력

npx firebase functions:secrets:set APP_URL
# 프롬프트에 값 입력: https://storeflow.kr
# Enter 키 입력
```

### 방법 2: 파이프 사용
```bash
echo "noreply@storeflow.kr" | npx firebase functions:secrets:set MAIL_USER
echo "your-16-digit-password" | npx firebase functions:secrets:set MAIL_PASSWORD
echo "noreply@storeflow.kr" | npx firebase functions:secrets:set MAIL_FROM
echo "https://storeflow.kr" | npx firebase functions:secrets:set APP_URL
```

### 방법 3: 파일에서 읽기
```bash
# secrets.txt 파일 생성 (각 줄에 하나씩)
cat secrets.txt | npx firebase functions:secrets:set MAIL_USER
```

## Secrets 확인

```bash
# Secrets 목록 확인
npx firebase functions:secrets:access MAIL_USER

# 모든 Secrets 확인
npx firebase functions:secrets:list
```

## 주의사항

1. **복수형 사용**: `functions` (복수), `function` (단수) 아님
2. **npx 사용**: `npx firebase` 또는 로컬에 설치된 경우 `firebase`
3. **값 입력**: 명령어 뒤에 직접 값을 붙이지 않고, 프롬프트에 입력하거나 파이프 사용
4. **재배포 필수**: Secrets 설정 후 Functions 재배포 필요

## 전체 설정 예시

```bash
# 1. 이메일 주소 설정
npx firebase functions:secrets:set MAIL_USER
# 입력: noreply@storeflow.kr

# 2. App Password 설정
npx firebase functions:secrets:set MAIL_PASSWORD
# 입력: xxxxxxyyyyyyzzzz

# 3. 발신자 이메일 설정
npx firebase functions:secrets:set MAIL_FROM
# 입력: noreply@storeflow.kr

# 4. 앱 URL 설정
npx firebase functions:secrets:set APP_URL
# 입력: https://storeflow.kr

# 5. Functions 재배포
npm run firebase:deploy:functions
```

