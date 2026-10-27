'use client';
// 전역 데이터 컨텍스트: 규범 축(초기 로딩) + 판례·해석 축(지연 로딩) + 상세 패널 상태
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BookText, CaseItem, DatasetMeta, FullText, NormItem, Relation } from '@/types/model';
import { withBase } from './links';

export type DetailTab = 'overview' | 'articles' | 'text' | 'cases' | 'ordinances' | 'summary' | 'norms' | 'same';
export interface DetailState {
  id: string;
  tab?: DetailTab;
  article?: string;
  /** 조문 본문 탭에서 강조할 검색어 */
  q?: string;
}

interface Store {
  norms: NormItem[];
  relations: Relation[];
  meta: DatasetMeta;
  aliases: string[][];
  /** 법규집 편제 순번 (정규화 명칭 → 번호) */
  rank: Record<string, number>;
  normById: Map<string, NormItem>;
  childrenOf: Map<string | null, NormItem[]>;
  detail: DetailState | null;
  openDetail: (id: string, opts?: Omit<DetailState, 'id'>) => void;
  closeDetail: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

export function DataProvider(props: { norms: NormItem[]; relations: Relation[]; meta: DatasetMeta; aliases: string[][]; rank: Record<string, number>; children: ReactNode }) {
  const { norms, relations, meta, aliases, rank } = props;
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const normById = useMemo(() => new Map(norms.map((n) => [n.id, n])), [norms]);
  const childrenOf = useMemo(() => {
    const m = new Map<string | null, NormItem[]>();
    for (const n of norms) {
      const k = n.parentId;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(n);
    }
    return m;
  }, [norms]);

  const openDetail = useCallback((id: string, opts?: Omit<DetailState, 'id'>) => setDetail({ id, ...opts }), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const value = useMemo(
    () => ({ norms, relations, meta, aliases, rank, normById, childrenOf, detail, openDetail, closeDetail, paletteOpen, setPaletteOpen }),
    [norms, relations, meta, aliases, rank, normById, childrenOf, detail, openDetail, closeDetail, paletteOpen],
  );
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('DataProvider 누락');
  return s;
}

// 판례·해석 축은 필요할 때 한 번만 내려받는다 (설계서 5장: cases.json 지연 로딩)
let casesPromise: Promise<CaseItem[]> | null = null;
let casesCache: CaseItem[] | null = null;
export function loadCases(): Promise<CaseItem[]> {
  casesPromise ??= fetch(withBase('/data/cases.json'))
    .then((r) => (r.ok ? r.json() : []))
    .then((c: CaseItem[]) => (casesCache = c))
    .catch(() => {
      casesPromise = null;
      return [];
    });
  return casesPromise;
}

export function useCases(enabled = true, initial?: CaseItem[]): CaseItem[] | null {
  const [cases, setCases] = useState<CaseItem[] | null>(initial ?? casesCache);
  useEffect(() => {
    if (!enabled || cases) return;
    let alive = true;
    loadCases().then((c) => alive && setCases(c));
    return () => {
      alive = false;
    };
  }, [enabled, cases]);
  return cases;
}

// 조문 본문은 조문 내용 검색·본문 탭을 쓸 때만 내려받는다 (fulltext.json, 수백 KB)
let ftPromise: Promise<FullText> | null = null;
let ftCache: FullText | null = null;
export function loadFullText(): Promise<FullText> {
  ftPromise ??= fetch(withBase('/data/fulltext.json'))
    .then((r) => (r.ok ? r.json() : {}))
    .then((f: FullText) => (ftCache = f))
    .catch(() => {
      ftPromise = null;
      return {};
    });
  return ftPromise;
}

export function useFullText(enabled: boolean): FullText | null {
  const [ft, setFt] = useState<FullText | null>(ftCache);
  useEffect(() => {
    if (!enabled || ft) return;
    let alive = true;
    loadFullText().then((f) => alive && setFt(f));
    return () => {
      alive = false;
    };
  }, [enabled, ft]);
  return ft;
}

// 법규집에만 있는 항목(V~VII) 본문 — 법규집 읽기 팝업에서 그 항목을 열 때만 내려받는다 (book-text.json)
let btPromise: Promise<BookText> | null = null;
let btCache: BookText | null = null;
export function loadBookText(): Promise<BookText> {
  btPromise ??= fetch(withBase('/data/book-text.json'))
    .then((r) => (r.ok ? r.json() : {}))
    .then((f: BookText) => (btCache = f))
    .catch(() => {
      btPromise = null;
      return {};
    });
  return btPromise;
}

export function useBookText(enabled: boolean): BookText | null {
  const [bt, setBt] = useState<BookText | null>(btCache);
  useEffect(() => {
    if (!enabled || bt) return;
    let alive = true;
    loadBookText().then((f) => alive && setBt(f));
    return () => {
      alive = false;
    };
  }, [enabled, bt]);
  return bt;
}
