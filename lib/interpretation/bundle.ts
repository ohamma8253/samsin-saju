import type { SamsinData } from '../saju';
import type { DivinationSystem, InterpretationEvidence } from './evidence';
import { extractNatalEvidence } from './natal';
import { extractSajuEvidence } from './saju';
import { extractZiweiEvidence } from './ziwei';

const SYSTEM_LABEL: Record<DivinationSystem, string> = {
  saju: '사주',
  ziwei: '자미두수',
  natal: '서양점성',
};

export function extractSamsinEvidence(data: SamsinData): InterpretationEvidence[] {
  return [
    ...extractSajuEvidence(data),
    ...extractZiweiEvidence(data),
    ...extractNatalEvidence(data),
  ].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
}

export function formatEvidencePromptContext(data: SamsinData, maxItems = 12): string {
  const evidence = extractSamsinEvidence(data).slice(0, maxItems);
  if (evidence.length === 0) {
    return '구조화 근거 없음. 출생 정보 불확실성 또는 계산 제한으로 강한 주장을 만들지 않는다.';
  }

  return evidence.map(item => {
    const basis = item.userFacing.basis.join(' / ');
    const caveat = item.userFacing.caveat ? ` / caveat=${item.userFacing.caveat}` : '';
    return [
      `- evidence_id=${item.id}`,
      `system=${SYSTEM_LABEL[item.system]}`,
      `domain=${item.domain}`,
      `axis=${item.claimAxis}`,
      `rule_id=${item.provenance.ruleId}`,
      `strength<=${item.claimBinding.maxClaimStrength}`,
      `claim=${item.claim}`,
      `basis=${basis}${caveat}`,
    ].join(' | ');
  }).join('\n');
}
