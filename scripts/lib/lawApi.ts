// 법제처 국가법령정보 공동활용 Open API 클라이언트 (설계서 4.1, 4.3)
// - Referer / 브라우저 UA 고정 주입
// - 루트 태그 검증 → 지수 백오프 재시도(3회) → 실패 시 예외 (호출자가 이전 스냅샷 유지)
// - 요청 간 300ms 지연, 동시성 2
// - OC 키 마스킹

const BASE = 'https://www.law.go.kr/DRF';
const HEADERS = {
  Referer: 'https://www.law.go.kr/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json, text/xml;q=0.9, */*;q=0.8',
};
const DELAY_MS = 300;
const CONCURRENCY = 2;
const RETRIES = 3;

export class LawApiError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

export function mask(s: string): string {
  return s.replace(/OC=[^&\s]+/g, 'OC=***');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 간단한 동시성 제한 큐
let active = 0;
const waiters: (() => void)[] = [];
async function acquire() {
  if (active < CONCURRENCY) {
    active++;
    return;
  }
  await new Promise<void>((r) => waiters.push(r));
  active++;
}
function release() {
  active--;
  waiters.shift()?.();
}

export interface LawApiOptions {
  oc: string;
  onRaw?: (key: string, body: string) => void;
}

type Json = Record<string, unknown>;

async function fetchJson(url: string, opts: LawApiOptions, rawKey: string): Promise<Json> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    await acquire();
    try {
      await sleep(DELAY_MS);
      const res = await fetch(url, { headers: HEADERS });
      const text = await res.text();
      if (!res.ok) throw new LawApiError(`HTTP ${res.status}`, res.status >= 500 || res.status === 429);
      const trimmed = text.trim();
      if (!trimmed) throw new LawApiError('빈 응답', true);
      if (trimmed.startsWith('<')) throw new LawApiError('HTML/XML 응답(점검·안티봇 페이지 추정)', true);
      let json: Json;
      try {
        json = JSON.parse(trimmed);
      } catch {
        throw new LawApiError('JSON 파싱 실패', true);
      }
      const msg = JSON.stringify(json).slice(0, 300);
      if (/사용자\s*정보\s*검증/.test(msg) || /인증/.test(String((json as Json).result ?? ''))) {
        throw new LawApiError(`인증 실패: ${msg}`, false);
      }
      if (Object.keys(json).length === 0) throw new LawApiError('루트 태그 없음', true);
      opts.onRaw?.(rawKey, trimmed);
      return json;
    } catch (e) {
      lastErr = e;
      if (e instanceof LawApiError && !e.retryable) throw e;
      await sleep(1000 * 2 ** attempt);
    } finally {
      release();
    }
  }
  const m = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new LawApiError(`${mask(url)} — 재시도 ${RETRIES}회 실패: ${m}`, true);
}

function rootOf(json: Json): Json {
  const keys = Object.keys(json);
  if (keys.length === 1 && json[keys[0]] && typeof json[keys[0]] === 'object') return json[keys[0]] as Json;
  return json;
}

function asArray<T>(v: unknown): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? (v as T[]) : [v as T];
}

/** 응답 객체에서 후보 키 중 처음 존재하는 값을 문자열로 꺼낸다 (P0 실측 전 필드명 변이 대비) */
export function pick(obj: Json | undefined, keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number') {
      const s = String(v).trim();
      if (s) return s;
    }
    if (Array.isArray(v)) return v.map(String).join(' ');
    if (typeof v === 'object' && 'content' in (v as Json)) return String((v as Json).content);
  }
  return undefined;
}

export interface SearchParams {
  target: string;
  query?: string;
  search?: 1 | 2;
  extra?: Record<string, string>;
}

export interface SearchResult {
  totalCnt: number;
  items: Json[];
}

/** lawSearch.do 목록 조회 — page 루프 + totalCnt 대조 */
export async function search(params: SearchParams, opts: LawApiOptions): Promise<SearchResult> {
  const items: Json[] = [];
  let totalCnt = 0;
  for (let page = 1; page <= 100; page++) {
    const q = new URLSearchParams({ OC: opts.oc, target: params.target, type: 'JSON', display: '100', page: String(page) });
    if (params.query) q.set('query', params.query);
    if (params.search) q.set('search', String(params.search));
    for (const [k, v] of Object.entries(params.extra ?? {})) q.set(k, v);
    const url = `${BASE}/lawSearch.do?${q}`;
    const json = await fetchJson(url, opts, `${params.target}-${params.query ?? ''}-${params.search ?? 1}-p${page}`);
    const root = rootOf(json);
    totalCnt = Number(pick(root, ['totalCnt', 'totalcnt', 'TotalCnt']) ?? 0);
    // 목록 키는 target 별로 다르다(law, prec, expc, admrul ...). 객체/배열 값 중 첫 번째를 목록으로 본다.
    const listKey = Object.keys(root).find((k) => typeof root[k] === 'object' && root[k] !== null);
    const pageItems = listKey ? asArray<Json>(root[listKey]) : [];
    items.push(...pageItems);
    if (pageItems.length < 100 || items.length >= totalCnt) break;
  }
  if (totalCnt && items.length < totalCnt) {
    console.warn(`  ⚠ ${params.target}/${params.query}: totalCnt ${totalCnt} 중 ${items.length}건만 수신`);
  }
  return { totalCnt, items };
}

/** lawService.do 본문 조회 */
export async function service(target: string, id: string, opts: LawApiOptions, idParam = 'ID'): Promise<Json> {
  const q = new URLSearchParams({ OC: opts.oc, target, type: 'JSON', [idParam]: id });
  return rootOf(await fetchJson(`${BASE}/lawService.do?${q}`, opts, `${target}-detail-${id}`));
}

/** API 상세링크 → OC 제거한 절대 URL */
export function normalizeDetailLink(link: string | undefined): string | undefined {
  if (!link) return undefined;
  let url = link.trim();
  if (url.startsWith('/')) url = `https://www.law.go.kr${url}`;
  try {
    const u = new URL(url);
    u.searchParams.delete('OC');
    u.searchParams.set('type', 'HTML');
    return u.toString();
  } catch {
    return undefined;
  }
}
