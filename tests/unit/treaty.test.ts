import { describe, expect, it } from 'vitest';
import { classifyNorms } from '../../scripts/classify.ts';
import { loadConfig } from '../../scripts/lib/config.ts';
import type { NormDraft } from '../../scripts/lib/drafts.ts';

const t = (seq: string, title: string): NormDraft => ({
  id: `trty:${seq}`, source: 'trty', sourceId: seq, title, kind: '다자조약', agency: '외교부', url: `https://www.law.go.kr/LSW/trtyInfoP.do?trtySeq=${seq}`, level: 'L0_TREATY', field: 'INT',
});

describe('조약 계층', () => {
  const items = classifyNorms(
    [
      t('324', '1949년 8월 12일자 제네바협약에 대한 추가 및 국제적 무력충돌의 희생자 보호에 관한 의정서 (제1의정서)'),
      t('15499', '1949년 8월 12일자 제네바협약에 대한 추가 및 국제적 무력충돌의 희생자 보호에 관한 의정서 중 유보사항'),
      t('2159', '1949년 8월 12일자 제네바협약에 대한 추가 및 국제적 무력충돌의 희생자 보호에 관한 의정서(제1의정서) 제90조 국제사실조사위원회 선언'),
      t('323', '1949년 8월 12일자 제네바협약에 대한 추가 및 비국제적 무력충돌의 희생자 보호에 관한 의정서 (제2의정서)'),
      t('13619', '대한민국 정부와 국제적십자위원회 간의 협정'),
    ],
    loadConfig(),
  );
  const parent = (id: string) => items.find((i) => i.id === id)?.parentId;
  it('유보·선언은 제1의정서 아래', () => {
    expect(parent('trty:15499')).toBe('trty:324');
    expect(parent('trty:2159')).toBe('trty:324');
  });
  it('제1의정서·제2의정서·ICRC 협정은 뿌리', () => {
    expect(parent('trty:324')).toBeNull();
    expect(parent('trty:323')).toBeNull();
    expect(parent('trty:13619')).toBeNull();
  });
  it('조약에는 상위 미지정 플래그를 달지 않는다', () => {
    expect(items.every((i) => !i.flags.includes('NO_PARENT'))).toBe(true);
  });
});
