import { FAMILY, type Family } from '@/lib/labels';
import { FamilyChip } from './Chips';

const DESC: Record<Family, string> = {
  law: '헌법·조약·법률·시행령·행정규칙',
  local: '조례·자치규칙',
  inst: '정관·규정·시행규칙·지침',
  case: '판례·헌재·해석례·1차 해석·결정선례·행정심판',
};

export function Legend() {
  return (
    <details className="relative text-sm">
      <summary className="cursor-pointer select-none text-muted hover:text-text">범례</summary>
      <ul className="absolute right-0 z-30 mt-2 w-72 space-y-2 rounded-lg border border-border bg-surface p-3 shadow-lg">
        {(Object.keys(FAMILY) as Family[]).map((f) => (
          <li key={f} className="flex flex-col gap-1">
            <FamilyChip family={f} label={FAMILY[f].name} />
            <span className="text-xs text-muted">{DESC[f]}</span>
          </li>
        ))}
        <li className="border-t border-border pt-2 text-xs text-muted">
          라벨 끝 ↗ = law.go.kr 원문(새 탭) · 항목 클릭 = 상세 패널 · ⚖ N = 연결된 판례·해석 수
        </li>
      </ul>
    </details>
  );
}
