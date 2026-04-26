# AI Stock Map — 내 AI 종목 노트북

미국 상장 AI 관련 종목을 **섹터별 생태계 맵**으로 시각화하고, 회사별로 **자유 블록 노트**(TipTap)를 모아두는 개인 도구. 전체 맵 / 개별 종목 정보를 **JSON으로 내보내** 다른 AI에 컨텍스트로 줄 수 있음.

## 스택
- Next.js 14 (App Router) + TypeScript + Tailwind
- Firebase Auth (Google) + Firestore
- TipTap (블록 에디터)

## 데이터 구조
```
users/{uid}/
  sectors/{sectorId}            # 섹터 메타
  companies/{ticker}            # 회사 (한줄요약, 태그, sectorId)
  companies/{ticker}/blocks/{id} # 회사 노트 — 자유 블록 (TipTap JSON)
```

## 셋업

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **Firebase 프로젝트 준비**
   - 콘솔에서 Firestore 활성화 (네이티브 모드)
   - Authentication > Google 로그인 활성화
   - 본인 계정으로 한 번 로그인 → UID 확인

3. **환경변수**
   - `.env.local.example` 을 `.env.local` 로 복사 후 채우기
   - 웹 SDK 키, `NEXT_PUBLIC_OWNER_UID` (본인 UID)

4. **보안 규칙 배포**
   ```bash
   firebase deploy --only firestore:rules
   ```
   (`firestore.rules` 참고)

5. **시드 데이터 푸시**
   - Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > "새 비공개 키" → `service-account.json` 으로 프로젝트 루트에 저장
   - `.env.local` 에 `SEED_OWNER_UID` 설정
   ```bash
   npm run seed
   ```
   `seed/initial-data.json` 의 8개 섹터 + 30+개 회사가 Firestore 에 들어감.

6. **개발 서버**
   ```bash
   npm run dev
   ```

## 주요 기능
- **메인 (`/`)**: 섹터 카드 그리드, 회사 추가/삭제, 검색, 전체 맵 JSON 내보내기
- **회사 상세 (`/company/[ticker]`)**: 자유 블록 섹션 추가/이동/삭제, 자동 저장, 개별 JSON 내보내기, **AI 프롬프트 복사**

## 내보내기 포맷
- 전체 맵: 가벼운 JSON (티커 + 한줄요약) — 새 종목 스크리닝 시 AI에 "내가 아는 종목 풀" 컨텍스트로 사용
- 개별 회사: 모든 블록 포함 — 깊이 분석 시 사용
- "AI 프롬프트 복사": 마크다운 변환 + 질문 템플릿이 클립보드에

## 다음 후보
- React Flow 기반 노드 그래프 메인 (드래그로 섹터 이동)
- 공개 플래그(`public:true`)로 포트폴리오 사이트 임베드
- 마크다운 import (붙여넣기 → TipTap)
