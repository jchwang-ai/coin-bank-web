# 🪙 코인 은행 — 배포 가이드

## 1️⃣ GitHub 저장소 생성 & 푸시

```bash
# GitHub에서 새 repo 만들기: coin-bank-web
# 그 다음:

git remote set-url origin https://github.com/YOUR_USERNAME/coin-bank-web.git
git push -u origin master
```

## 2️⃣ Neon DB 설정

### Step 1: Neon 프로젝트 생성
1. https://console.neon.tech 접속 (jchwang@pulleymath.com로 로그인)
2. "New Project" 클릭
3. 프로젝트명: `coin-bank`
4. PostgreSQL 선택
5. "Create project" 클릭

### Step 2: 연결 문자열 복사
1. Neon 콘솔에서 프로젝트 선택
2. "Connection string" 섹션에서 "Pooled connection string" 복사
3. 형식: `postgresql://[user]:[password]@[host]/[database]`

### Step 3: 로컬 테스트 (선택)
```bash
# .env.local 파일 수정
DATABASE_URL=postgresql://[위에서 복사한 연결 문자열]

# 로컬에서 테스트
npm run dev
# http://localhost:3000 접속 후 부모/아이 로그인 테스트
```

## 3️⃣ Vercel 배포

### Step 1: Vercel에 GitHub 연동
1. https://vercel.com 접속 (jchwang@pulleymath.com로 로그인)
2. "Add New" → "Project" 클릭
3. GitHub에서 `coin-bank-web` 저장소 선택
4. "Import" 클릭

### Step 2: 환경 변수 설정
Vercel 대시보드에서:
1. 프로젝트 선택 → Settings → Environment Variables
2. 다음 변수 추가:

```
DATABASE_URL = [Neon에서 복사한 연결 문자열]
PIN_SECRET = coin-bank-secret-2024
NEXT_PUBLIC_APP_URL = https://your-domain.vercel.app
```

### Step 3: 배포
"Deploy" 버튼 클릭 → 빌드 & 배포 완료 대기

## 4️⃣ 데이터베이스 초기화

배포 후 한 번만 실행:

```bash
# Option 1: Neon 콘솔에서 직접 SQL 실행
# Neon 콘솔 → SQL Editor → 아래 SQL 복사 & 실행

# Option 2: API 호출로 초기화
curl -X POST https://your-domain.vercel.app/api/init-db
```

## 5️⃣ QR 코드 생성

배포 후 부모는 다음 URL의 QR 코드를 사용:

```
https://your-domain.vercel.app
```

또는 QR 코드 생성 사이트(qr-code-generator.com 등)에서:
```
https://your-domain.vercel.app/?qr=true
```

---

## 🔑 기본 PIN
- **부모**: 1101
- **아이**: 1202

## 📱 모바일 접속
1. 부모 & 아이 각각 다른 기기에서 위 URL 접속
2. 자신의 PIN 입력 → 로그인
3. 자동으로 역할 구분됨

## 🔄 테스트 체크리스트

- [ ] 부모로 로그인 가능
- [ ] 아이로 로그인 가능
- [ ] 부모: 코인 주기 가능
- [ ] 아이: 코인 잔액 증가 확인 (5초마다 새로고침)
- [ ] 아이: 쿠폰 구매 가능
- [ ] 부모: 쿠폰 추가/수정/삭제 가능
- [ ] 접속 기록 저장됨

---

## 🆘 문제 해결

### "DATABASE_URL is required" 에러
→ Vercel 환경 변수에 DATABASE_URL 추가했는지 확인

### "Cannot connect to database" 에러
→ Neon 연결 문자열이 정확한지 확인

### 데이터가 저장 안 됨
→ Neon 콘솔에서 SQL Editor로 테이블 확인

---

**✅ 배포 완료!** 🎉
