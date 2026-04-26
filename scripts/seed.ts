/**
 * Firestore에 시드 데이터(섹터 + 회사) 푸시.
 *
 * 준비:
 *  1) Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > "새 비공개 키 생성" → service-account.json
 *  2) .env.local 에 GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
 *  3) .env.local 에 SEED_OWNER_UID=<본인 Firebase Auth UID>
 *  4) npm run seed
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import admin from "firebase-admin";

const ownerUid = process.env.SEED_OWNER_UID;
if (!ownerUid) {
  console.error("SEED_OWNER_UID 환경변수가 필요합니다 (.env.local)");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const db = admin.firestore();

type Seed = {
  sectors: { id: string; name: string; description?: string; color: string; order: number }[];
  companies: { ticker: string; name: string; sectorId: string; oneLineSummary?: string; tags?: string[] }[];
};

const seed = JSON.parse(
  readFileSync(resolve(process.cwd(), "seed/initial-data.json"), "utf8")
) as Seed;

async function main() {
  const root = `users/${ownerUid}`;
  const batch = db.batch();

  for (const s of seed.sectors) {
    batch.set(db.doc(`${root}/sectors/${s.id}`), s, { merge: true });
  }
  for (const c of seed.companies) {
    batch.set(
      db.doc(`${root}/companies/${c.ticker}`),
      { ...c, updatedAt: Date.now() },
      { merge: true }
    );
  }
  await batch.commit();
  console.log(
    `Seeded ${seed.sectors.length} sectors, ${seed.companies.length} companies → users/${ownerUid}`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
