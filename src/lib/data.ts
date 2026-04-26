import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Block, Company, Sector } from "./types";

const userRoot = (uid: string) => `users/${uid}`;
const sectorsCol = (uid: string) => collection(db, `${userRoot(uid)}/sectors`);
const companiesCol = (uid: string) => collection(db, `${userRoot(uid)}/companies`);
const companyBlocksCol = (uid: string, ticker: string) =>
  collection(db, `${userRoot(uid)}/companies/${ticker}/blocks`);
const sectorBlocksCol = (uid: string, sectorId: string) =>
  collection(db, `${userRoot(uid)}/sectors/${sectorId}/blocks`);

// --- Sectors ---
export async function listSectors(uid: string): Promise<Sector[]> {
  const snap = await getDocs(query(sectorsCol(uid), orderBy("order", "asc")));
  return snap.docs.map((d) => d.data() as Sector);
}
export async function getSector(uid: string, id: string): Promise<Sector | null> {
  const d = await getDoc(doc(sectorsCol(uid), id));
  return d.exists() ? (d.data() as Sector) : null;
}
export const upsertSector = (uid: string, s: Sector) =>
  setDoc(doc(sectorsCol(uid), s.id), s, { merge: true });
export const deleteSector = (uid: string, id: string) =>
  deleteDoc(doc(sectorsCol(uid), id));

// --- Companies ---
export async function listCompanies(uid: string): Promise<Company[]> {
  const snap = await getDocs(companiesCol(uid));
  return snap.docs.map((d) => d.data() as Company);
}
export async function getCompany(uid: string, ticker: string): Promise<Company | null> {
  const d = await getDoc(doc(companiesCol(uid), ticker));
  return d.exists() ? (d.data() as Company) : null;
}
export const upsertCompany = (uid: string, c: Company) =>
  setDoc(doc(companiesCol(uid), c.ticker), { ...c, updatedAt: Date.now() }, { merge: true });
export const updateCompanySector = (uid: string, ticker: string, sectorId: string) =>
  updateDoc(doc(companiesCol(uid), ticker), { sectorId, updatedAt: Date.now() });
export const deleteCompany = (uid: string, ticker: string) =>
  deleteDoc(doc(companiesCol(uid), ticker));

// 회사 티커 변경: 새 문서 + 모든 블록 복사 후 옛 문서 삭제
export async function renameCompany(uid: string, oldTicker: string, newTicker: string) {
  if (oldTicker === newTicker) return;
  const old = await getCompany(uid, oldTicker);
  if (!old) throw new Error("기존 회사를 찾을 수 없습니다");
  const dup = await getCompany(uid, newTicker);
  if (dup) throw new Error(`${newTicker} 는 이미 존재합니다`);
  const oldBlocks = await listCompanyBlocks(uid, oldTicker);

  const next: Company = { ...old, ticker: newTicker, updatedAt: Date.now() };
  await setDoc(doc(companiesCol(uid), newTicker), next);
  await Promise.all(
    oldBlocks.map((b) =>
      setDoc(doc(companyBlocksCol(uid, newTicker), b.id), { ...b, updatedAt: Date.now() })
    )
  );
  await Promise.all(oldBlocks.map((b) => deleteDoc(doc(companyBlocksCol(uid, oldTicker), b.id))));
  await deleteDoc(doc(companiesCol(uid), oldTicker));
}

export async function bulkAddSectorsAndCompanies(
  uid: string,
  sectors: Sector[],
  companies: Company[]
) {
  await Promise.all([
    ...sectors.map((s) => setDoc(doc(sectorsCol(uid), s.id), s, { merge: true })),
    ...companies.map((c) =>
      setDoc(doc(companiesCol(uid), c.ticker), { ...c, updatedAt: Date.now() }, { merge: true })
    ),
  ]);
}

// --- Blocks (회사) ---
export async function listCompanyBlocks(uid: string, ticker: string): Promise<Block[]> {
  const snap = await getDocs(query(companyBlocksCol(uid, ticker), orderBy("order", "asc")));
  return snap.docs.map((d) => ({ ...(d.data() as Block), id: d.id }));
}
// 하위 호환
export const listBlocks = listCompanyBlocks;
export const upsertCompanyBlock = (uid: string, ticker: string, b: Block) =>
  setDoc(doc(companyBlocksCol(uid, ticker), b.id), { ...b, updatedAt: Date.now() }, { merge: true });
export const upsertBlock = upsertCompanyBlock;
export const deleteCompanyBlock = (uid: string, ticker: string, blockId: string) =>
  deleteDoc(doc(companyBlocksCol(uid, ticker), blockId));
export const deleteBlock = deleteCompanyBlock;
export const bulkUpsertCompanyBlocks = (uid: string, ticker: string, bs: Block[]) =>
  Promise.all(bs.map((b) => upsertCompanyBlock(uid, ticker, b)));
export const bulkUpsertBlocks = bulkUpsertCompanyBlocks;

// --- Blocks (섹터) ---
export async function listSectorBlocks(uid: string, sectorId: string): Promise<Block[]> {
  const snap = await getDocs(query(sectorBlocksCol(uid, sectorId), orderBy("order", "asc")));
  return snap.docs.map((d) => ({ ...(d.data() as Block), id: d.id }));
}
export const upsertSectorBlock = (uid: string, sectorId: string, b: Block) =>
  setDoc(doc(sectorBlocksCol(uid, sectorId), b.id), { ...b, updatedAt: Date.now() }, { merge: true });
export const deleteSectorBlock = (uid: string, sectorId: string, blockId: string) =>
  deleteDoc(doc(sectorBlocksCol(uid, sectorId), blockId));
export const bulkUpsertSectorBlocks = (uid: string, sectorId: string, bs: Block[]) =>
  Promise.all(bs.map((b) => upsertSectorBlock(uid, sectorId, b)));

// --- Realtime helpers ---
export function watchCompanies(uid: string, cb: (rows: Company[]) => void) {
  return onSnapshot(companiesCol(uid), (snap) =>
    cb(snap.docs.map((d) => d.data() as Company))
  );
}
export function watchSectors(uid: string, cb: (rows: Sector[]) => void) {
  return onSnapshot(query(sectorsCol(uid), orderBy("order", "asc")), (snap) =>
    cb(snap.docs.map((d) => d.data() as Sector))
  );
}
export { serverTimestamp };
