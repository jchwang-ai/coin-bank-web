# 🚀 코인 은행 배포 — 단계별 가이드

## 📋 현재 상태
- ✅ Next.js 프로젝트 완성
- ✅ 모든 페이지 & 컴포넌트 작성
- ✅ 서버 액션 & API 엔드포인트 작성
- ⏳ Neon DB 연결 필요
- ⏳ Vercel 배포 필요

---

## 🔑 Step 1: GitHub에 푸시 (필수!)

```bash
# 현재 위치: C:\claude\all\coin-bank-web

# 1️⃣ GitHub에서 새 저장소 만들기
# https://github.com/new
# - Repository name: coin-bank-web
# - Public 선택
# - "Create repository" 클릭

# 2️⃣ 로컬에서 GitHub로 푸시
git remote add origin https://github.com/YOUR_USERNAME/coin-bank-web.git
git branch -M main
git push -u origin main
```

---

## 🗄️ Step 2: Neon PostgreSQL 설정

### 2-1. Neon 프로젝트 생성
1. https://console.neon.tech 접속
2. 이메일: **jchwang@pulleymath.com**
3. "New Project" 클릭
4. **프로젝트명**: coin-bank
5. PostgreSQL 선택 → "Create project" 클릭

### 2-2. 연결 문자열 복사
```
Neon 콘솔 → coin-bank 프로젝트
→ "Connection" 탭 
→ "Connection string" 섹션
→ "Pooled connection" 문자열 복사 (psql로 시작하는 부분)

형식:
postgresql://neon_user:[PASSWORD]@[HOST]/neondb
```

**이 문자열을 어딘가 메모해 두세요!** (다음 단계에서 필요)

### 2-3. 로컬에서 테스트 (선택사항)
```bash
# .env.local 파일 수정
# DATABASE_URL=[위에서 복사한 문자열] 로 바꾸기

npm run dev
# http://localhost:3000 에서 테스트
```

---

## 🚀 Step 3: Vercel 배포

### 3-1. Vercel에 로그인 & 프로젝트 생성
1. https://vercel.com 접속 (jchwang@pulleymath.com로 로그인)
2. "Add New" → "Project" 클릭
3. GitHub 연동 (처음이면 GitHub 인증 필요)
4. **coin-bank-web** 저장소 선택
5. "Import" 클릭

### 3-2. 환경 변수 설정 (⭐ 중요!)
Vercel 대시보드에서:
```
Settings → Environment Variables

다음 변수 추가:

Name: DATABASE_URL
Value: [Neon에서 복사한 PostgreSQL 연결 문자열]

Name: PIN_SECRET
Value: coin-bank-secret-2024

Name: NEXT_PUBLIC_APP_URL
Value: https://coin-bank-web.vercel.app
(배포 후 Vercel이 주는 URL로 변경)
```

### 3-3. 배포 시작
1. "Deploy" 버튼 클릭
2. 빌드 로그 확인 (5-10분 소요)
3. "Congratulations! Your project has been successfully deployed" 메시지 대기

---

## 💾 Step 4: 데이터베이스 초기화

배포 후 **처음 한 번만** 실행:

### Option A: 브라우저에서
```
https://coin-bank-web.vercel.app/api/init-db
(POST 요청으로 변경)

또는 Vercel 함수 직접 호출:
curl -X POST https://coin-bank-web.vercel.app/api/init-db
```

### Option B: Neon 콘솔에서 직접
Neon 콘솔 → SQL Editor → 아래 SQL 복사 & 실행

```sql
-- parent_config 테이블
CREATE TABLE IF NOT EXISTS parent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- child_account 테이블
CREATE TABLE IF NOT EXISTS child_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin VARCHAR(255) NOT NULL,
  balance INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- shop_items 테이블
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- coupons 테이블
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  used BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP WITH TIME ZONE
);

-- transactions 테이블
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- access_logs 테이블
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  logged_out_at TIMESTAMP WITH TIME ZONE
);

-- 초기 데이터 삽입
INSERT INTO parent_config (pin, email) VALUES (
  ENCODE(CONVERT_TO('1101', 'UTF8'), 'base64'),
  'jchwang@pulleymath.com'
);

INSERT INTO child_account (pin, balance) VALUES (
  ENCODE(CONVERT_TO('1202', 'UTF8'), 'base64'),
  0
);

INSERT INTO shop_items (emoji, name, price) VALUES
  ('📺', '유튜브 30분 보기', 5),
  ('🍦', '아이스크림 사먹기', 7),
  ('🎮', '게임 30분 하기', 8),
  ('😴', '주말 늦잠 자기', 10),
  ('🍕', '저녁 메뉴 정하기', 12),
  ('🎡', '주말 나들이 가기', 30);
```

---

## ✅ Step 5: 테스트

배포 완료 후:

1. **부모로 로그인**
   - URL: `https://coin-bank-web.vercel.app`
   - "부모님" 선택 → PIN: **1101** 입력
   - 코인 관리 화면 확인

2. **아이로 로그인** (다른 기기 또는 시크릿 창)
   - URL: `https://coin-bank-web.vercel.app`
   - "아이" 선택 → PIN: **1202** 입력
   - 코인 잔액 확인 (부모가 준 코인)

3. **아이가 쿠폰 구매**
   - 상점 탭에서 쿠폰 선택 & "사기" 클릭
   - 코인 차감 확인

4. **부모가 아이 화면 변경 감지**
   - 부모 화면 새로고침 (10초마다 자동)
   - 아이 코인 잔액 감소 확인

---

## 🔗 QR 코드 생성

배포 후 QR 코드로 공유:

```
https://coin-bank-web.vercel.app
```

부모 & 아이가 각각 이 링크를 스캔 → 자신의 PIN 입력하면 자동 구분됨

---

## 📱 모바일 접속

**부모 기기:**
```
https://coin-bank-web.vercel.app
→ "부모님" 선택
→ PIN: 1101
```

**아이 기기:**
```
https://coin-bank-web.vercel.app
→ "아이" 선택
→ PIN: 1202
```

---

## 🆘 문제 해결

### "Cannot find module '@vercel/postgres'"
→ `npm install` 후 다시 배포

### "DATABASE_URL is not defined"
→ Vercel 환경 변수 확인 (Settings → Environment Variables)

### "Connection refused"
→ Neon 연결 문자열 복사 확인

### 테이블이 없다는 에러
→ Step 4의 `POST /api/init-db` 또는 SQL 초기화 실행

---

## 🎯 최종 확인 체크리스트

- [ ] GitHub에 coin-bank-web 저장소 생성 & 푸시 완료
- [ ] Neon 프로젝트 생성 (coin-bank)
- [ ] 연결 문자열 복사
- [ ] Vercel에 프로젝트 import
- [ ] 환경 변수 3개 (DATABASE_URL, PIN_SECRET, NEXT_PUBLIC_APP_URL) 설정
- [ ] 배포 완료
- [ ] 데이터베이스 초기화 실행
- [ ] 부모 & 아이 모두 로그인 테스트
- [ ] 코인 주기 & 쿠폰 구매 테스트

---

## 🎉 완료!

모든 단계를 마치면 **https://coin-bank-web.vercel.app** 에서 
부모와 아이가 각각 다른 기기에서 실시간으로 코인을 주고받을 수 있습니다!

**궁금한 점?** 각 단계마다 에러 메시지 캡처해서 공유하면 도와줄게 😊
