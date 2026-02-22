'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StarsBg from '@/components/StarsBg';
import CookieBar from '@/components/CookieBar';
import CookieShopModal from '@/components/CookieShopModal';
import ChatModal from '@/components/ChatModal';
import PrescriptionCard from '@/components/PrescriptionCard';
import { getCookieCount } from '@/lib/cookies';
import { buildInviteUrl } from '@/lib/invite';
import type { SamsinInput } from '@/lib/saju';
import type { GraphPeriod, LifeMoment, FinalSynthesis, ReportContext } from '@/lib/claude';
import type { ConsensusMetrics, ConsensusLevel } from '@/lib/consensus';

const CHARACTERS = [
  { charKey: 'cheongwoon' as const, name: '청운', title: '사주팔자', emoji: '🌿', color: '#4ca87d' },
  { charKey: 'taeeul'     as const, name: '태을', title: '자미두수', emoji: '☁️', color: '#a78bfa' },
  { charKey: 'luna'       as const, name: '루나', title: '서양 점성술', emoji: '✦', color: '#c9a84c' },
];

const LOADING_MESSAGES = [
  '천명서를 꺼내고 있습니다...',
  '청운이 사주 원국을 펼칩니다...',
  '태을이 명반을 살핍니다...',
  '루나가 별자리를 읽습니다...',
  '세 신이 합의를 나눕니다...',
  '총운을 정리하고 있습니다...',
];

const DEEP_COST = 3;

const ELEMENTS = [
  { key: 'tree',  label: '木', color: '#4ca87d' },
  { key: 'fire',  label: '火', color: '#e05252' },
  { key: 'earth', label: '土', color: '#c9a84c' },
  { key: 'metal', label: '金', color: '#a8b4c8' },
  { key: 'water', label: '水', color: '#5b8ee6' },
];

interface TotalReport {
  characterVoices?: { cheongwoon: string; taeeul: string; luna: string };
  coreInsight?:     { headline: string; body: string };
  moneyGraph?:      GraphPeriod[];
  careerGraph?:     GraphPeriod[];
  peakMoments?:     LifeMoment[];
  hardMoments?:     LifeMoment[];
  samsinMessage:    string;
}

interface ReportMeta {
  name: string;
  dayPillar: string;
  yearPillar: string;
  wuxing: Record<string, number>;
}

interface DeepSection { title: string; content: string; }

// ─── 페이즈 메타데이터 ────────────────────────────────────────────────
const PHASE_META: Record<string, { color: string; symbol: string; label: string }> = {
  seeding:  { color: '#4ca87d', symbol: '🌱', label: '씨앗' },
  rising:   { color: '#5b8ee6', symbol: '↑',  label: '상승' },
  peak:     { color: '#c9a84c', symbol: '★',  label: '수확' },
  plateau:  { color: '#a78bfa', symbol: '〰', label: '안정' },
  declining:{ color: '#7a7a9a', symbol: '↓',  label: '하강' },
};

// ─── 3레이어 메타데이터 ──────────────────────────────────────────────
const LAYER_META = [
  { color: '#5b8ee6', symbol: '四', label: '사주', key: 'sajuScore' as const },
  { color: '#c9a84c', symbol: '紫', label: '자미', key: 'ziweiScore' as const },
  { color: '#a78bfa', symbol: '☿', label: '서양', key: 'natalScore' as const },
];

// ─── 그래프 컴포넌트 ────────────────────────────────────────────────
const SVG_W = 500;
const SVG_H = 90;
const SVG_PAD_X = 16;
const SVG_PAD_Y = 12;

function buildBezierPath(points: { x: number; y: number }[]): string {
  let p = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cpx = (points[i - 1].x + points[i].x) / 2;
    p += ` C ${cpx} ${points[i - 1].y} ${cpx} ${points[i].y} ${points[i].x} ${points[i].y}`;
  }
  return p;
}

function RuneGraph({ data, color, currentLabel }: { data: GraphPeriod[]; color: string; currentLabel?: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const n = data.length;
  if (n === 0) return null;

  const innerW = SVG_W - SVG_PAD_X * 2;
  const innerH = SVG_H - SVG_PAD_Y * 2;
  const px = (i: number) => SVG_PAD_X + (i / (n - 1)) * innerW;
  const segLeft  = (i: number): number => i === 0     ? px(0)     : (px(i - 1) + px(i)) / 2;
  const segRight = (i: number): number => i === n - 1 ? px(n - 1) : (px(i) + px(i + 1)) / 2;

  // ─── 3레이어 감지 ──────────────────────────────────────────────
  const hasTriple = data.some(d => d.sajuScore !== undefined);

  // ─── 단일 커브 계산 (폴백) ─────────────────────────────────────
  const sMin = Math.min(...data.map(d => d.score));
  const sMax = Math.max(...data.map(d => d.score), sMin + 1);
  const sRange = sMax - sMin || 1;
  const pyS = (v: number) => SVG_PAD_Y + innerH - ((v - sMin) / sRange) * innerH;
  const sPts = data.map((d, i) => ({ x: px(i), y: pyS(d.score) }));
  const sPath = buildBezierPath(sPts);
  const sFill = `${sPath} L ${sPts[n - 1].x} ${SVG_H} L ${sPts[0].x} ${SVG_H} Z`;
  const gradId = `lg-${color.replace('#', '')}`;

  // ─── 3레이어 커브 계산 ─────────────────────────────────────────
  const allTripleVals = hasTriple ? LAYER_META.flatMap(m => data.map(d => (d[m.key] as number | undefined) ?? d.score)) : [];
  const tMin = hasTriple ? Math.min(...allTripleVals) : 0;
  const tMax = hasTriple ? Math.max(...allTripleVals, tMin + 1) : 100;
  const tRange = tMax - tMin || 1;
  const pyT = (v: number) => SVG_PAD_Y + innerH - ((v - tMin) / tRange) * innerH;

  const layers = LAYER_META.map(meta => {
    const vals = data.map(d => (d[meta.key] as number | undefined) ?? d.score);
    const pts  = vals.map((v, i) => ({ x: px(i), y: pyT(v) }));
    const path = buildBezierPath(pts);
    const fill = `${path} L ${pts[n - 1].x} ${SVG_H} L ${pts[0].x} ${SVG_H} Z`;
    return { ...meta, vals, pts, path, fill };
  });

  // 합의 강도: 3점수 차이
  const consensusLevel = (i: number): 'strong' | 'weak' | 'none' => {
    const sj = data[i].sajuScore, zw = data[i].ziweiScore, nt = data[i].natalScore;
    if (sj === undefined || zw === undefined || nt === undefined) return 'none';
    if (sj >= 65 && zw >= 65 && nt >= 65) return 'strong';
    if (sj <= 40 && zw <= 40 && nt <= 40) return 'weak';
    return 'none';
  };

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full"
          style={{ overflow: 'visible', marginTop: '18px' }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            {LAYER_META.map(m => (
              <linearGradient key={m.key} id={`lg-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={m.color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={m.color} stopOpacity="0.01" />
              </linearGradient>
            ))}
          </defs>

          {hasTriple ? (
            <>
              {/* 합의 강도 배경 밴드 */}
              {data.map((_, i) => {
                const cl = consensusLevel(i);
                if (cl === 'none') return null;
                return (
                  <rect key={`cons-${i}`}
                    x={segLeft(i)} y={0} width={segRight(i) - segLeft(i)} height={SVG_H}
                    fill={cl === 'strong' ? '#c9a84c' : '#7a7a9a'} opacity={0.06} />
                );
              })}
              {/* 3개 면 */}
              {layers.map(l => (
                <path key={`fill-${l.key}`} d={l.fill} fill={`url(#lg-${l.key})`} />
              ))}
              {/* 3개 선 */}
              {layers.map(l => (
                <path key={`stroke-${l.key}`} d={l.path} fill="none" stroke={l.color}
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
              ))}
            </>
          ) : (
            <>
              <path d={sFill} fill={`url(#${gradId})`} />
              <path d={sPath} fill="none" stroke={color} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
            </>
          )}

          {/* 현재 위치 수직선 + "지금" 태그 */}
          {data.map((d, i) => {
            if (d.label !== currentLabel) return null;
            const x = px(i);
            return (
              <g key="current-vline">
                <line x1={x} y1={SVG_PAD_Y - 8} x2={x} y2={SVG_H}
                  stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
                <rect x={x - 14} y={SVG_PAD_Y - 18} width={28} height={13} rx={4}
                  fill={color} opacity={0.9} />
                <text x={x} y={SVG_PAD_Y - 9} textAnchor="middle" dominantBaseline="middle"
                  fontSize={8} fontWeight="700" fill="#06060f">
                  지금
                </text>
              </g>
            );
          })}

          {/* 점 + 호버 + 툴팁 */}
          {hasTriple ? data.map((d, i) => {
            const isCurrent = d.label === currentLabel;
            const isHov = hovered === i;
            const topY = Math.min(...layers.map(l => l.pts[i].y));
            return (
              <g key={i}>
                {/* 3개 레이어 점 */}
                {layers.map((l, li) => isCurrent ? (
                  <g key={l.key} transform={`translate(${l.pts[i].x}, ${l.pts[i].y})`}>
                    <circle cx={0} cy={0} r={6} fill={l.color}
                      style={{ animation: 'current-ring-pulse 2s ease-in-out infinite', transformOrigin: '0 0', animationDelay: `${li * 0.5}s` }} />
                    <circle cx={0} cy={0} r={4} fill={l.color} stroke="#06060f" strokeWidth={1.2} />
                  </g>
                ) : (
                  <circle key={l.key} cx={l.pts[i].x} cy={l.pts[i].y} r={2.5}
                    fill="var(--bg-card, #0d0d1a)" stroke={l.color} strokeWidth={1.3} opacity={isHov ? 1 : 0.55} />
                ))}
                {/* 호버 존 */}
                <rect x={segLeft(i)} y={0} width={segRight(i) - segLeft(i)} height={SVG_H}
                  fill="transparent" style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
                {/* 툴팁 */}
                {isHov && (
                  <foreignObject
                    x={Math.min(Math.max(px(i) - 82, 0), SVG_W - 165)}
                    y={topY > SVG_H / 2 ? topY - 88 : topY + 14}
                    width="165" height="86">
                    <div style={{
                      background: 'rgba(13,13,26,0.96)',
                      border: '1px solid rgba(201,168,76,0.35)',
                      borderRadius: 8,
                      padding: '5px 9px',
                      fontSize: 10,
                      color: 'var(--silver, #c0c0d0)',
                      lineHeight: 1.5,
                      textAlign: 'center',
                    }}>
                      <div style={{ marginBottom: 3, display: 'flex', justifyContent: 'center', gap: 8 }}>
                        {LAYER_META.map(m => (
                          <span key={m.key}>
                            <span style={{ color: m.color, fontWeight: 600, fontSize: 9 }}>{m.symbol} </span>
                            <b style={{ color: m.color }}>{(d[m.key] as number | undefined) ?? '—'}</b>
                          </span>
                        ))}
                      </div>
                      {consensusLevel(i) !== 'none' && (
                        <div style={{ fontSize: 8, color: consensusLevel(i) === 'strong' ? '#c9a84c' : '#7a7a9a', marginBottom: 2 }}>
                          {consensusLevel(i) === 'strong' ? '합의: 강함 ✓' : '합의: 잠복기 ○'}
                        </div>
                      )}
                      {d.phaseType && (
                        <span style={{ color: PHASE_META[d.phaseType]?.color, marginRight: 3, fontSize: 9 }}>
                          {PHASE_META[d.phaseType]?.symbol}
                        </span>
                      )}
                      <span style={{ fontSize: 9 }}>{d.note}</span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          }) : sPts.map((pt, i) => {
            const isCurrent = data[i].label === currentLabel;
            const isHov = hovered === i;
            return (
              <g key={i}>
                {isCurrent && (
                  <g transform={`translate(${pt.x}, ${pt.y})`}>
                    <circle cx={0} cy={0} r={12} fill={color}
                      style={{ animation: 'current-ring-pulse 2s ease-in-out infinite', transformOrigin: '0 0' }} />
                    <circle cx={0} cy={0} r={7} fill={color} stroke="#06060f" strokeWidth={2} />
                  </g>
                )}
                {!isCurrent && (
                  <circle cx={pt.x} cy={pt.y} r={3.5}
                    fill="var(--bg-card, #0d0d1a)" stroke={color} strokeWidth={1.5}
                    opacity={isHov ? 1 : 0.7}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
                )}
                {isCurrent && (
                  <circle cx={pt.x} cy={pt.y} r={12} fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
                )}
                {isHov && (
                  <foreignObject
                    x={Math.min(Math.max(pt.x - 75, 0), SVG_W - 150)}
                    y={pt.y > SVG_H / 2 ? pt.y - 72 : pt.y + 14}
                    width="150" height="68">
                    <div style={{
                      background: 'rgba(13,13,26,0.96)',
                      border: `1px solid ${color}55`,
                      borderRadius: 8,
                      padding: '5px 9px',
                      fontSize: 10,
                      color: 'var(--silver, #c0c0d0)',
                      lineHeight: 1.45,
                      textAlign: 'center',
                    }}>
                      <b style={{ color }}>{data[i].score}</b>
                      {data[i].phaseType && (
                        <span style={{ color: PHASE_META[data[i].phaseType!]?.color, marginLeft: 3 }}>
                          {PHASE_META[data[i].phaseType!]?.symbol}
                        </span>
                      )}
                      {' · '}{data[i].note}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 레이블 */}
      <div className="flex mt-1">
        {data.map((d, i) => {
          const isCurrent = d.label === currentLabel;
          return (
            <div key={i} className="flex-1 text-center"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <div className="text-[9px] leading-tight whitespace-pre-line"
                style={{ color: isCurrent ? color : 'var(--text-muted)' }}>
                {d.label}
              </div>
              {hasTriple ? (
                <div className="mt-0.5 flex gap-1 justify-center">
                  {LAYER_META.map(m => (
                    <span key={m.key} className="text-[7px]"
                      style={{ color: isCurrent ? m.color : `${m.color}66` }}>
                      {m.symbol}{(d[m.key] as number | undefined) ?? '?'}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[9px] font-bold mt-0.5"
                  style={{ color: isCurrent ? color : 'var(--text-muted, #666)' }}>
                  {d.score}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 페이즈 배지 행 */}
      {data.some(d => d.phaseType) && (
        <div className="flex mt-1.5">
          {data.map((d, i) => {
            const meta = d.phaseType ? PHASE_META[d.phaseType] : { color: '#555', symbol: '·', label: '' };
            const isCurrent = d.label === currentLabel;
            return (
              <div key={i} className="flex-1 flex justify-center">
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: `${meta.color}20`,
                  border: `1.5px solid ${meta.color}${isCurrent ? 'cc' : '44'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8,
                }}>
                  {meta.symbol}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 범례 — phaseType */}
      {data.some(d => d.phaseType) && (
        <div className="flex flex-wrap gap-x-3 mt-1.5 justify-center">
          {Object.entries(PHASE_META).map(([key, m]) =>
            data.some(d => d.phaseType === key) ? (
              <span key={key} className="flex items-center gap-1 text-[8px]" style={{ color: m.color }}>
                {m.symbol} {m.label}
              </span>
            ) : null
          )}
        </div>
      )}

      {/* 3레이어 범례 */}
      {hasTriple && (
        <div className="flex gap-x-4 mt-1.5 justify-center">
          {LAYER_META.map(m => (
            <span key={m.key} className="flex items-center gap-1 text-[8px]" style={{ color: m.color }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, display: 'inline-block', opacity: 0.7 }} />
              {m.label}
            </span>
          ))}
          <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            — 3곡선 겹칠수록 강한 합의
          </span>
        </div>
      )}
    </div>
  );
}

// ─── 오행 오각형 레이더 ───────────────────────────────────────────────
function WuxingRadar({ wuxing }: { wuxing: Record<string, number> }) {
  const SIZE = 160;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R  = 58;          // 최대 반지름
  const AXES = [
    { key: 'tree',  label: '木', color: '#4ca87d', angleDeg: -90        },  // 상단
    { key: 'fire',  label: '火', color: '#e05252', angleDeg: -90 + 72   },  // 우상
    { key: 'earth', label: '土', color: '#c9a84c', angleDeg: -90 + 144  },  // 우하
    { key: 'metal', label: '金', color: '#a8b4c8', angleDeg: -90 + 216  },  // 좌하
    { key: 'water', label: '水', color: '#5b8ee6', angleDeg: -90 + 288  },  // 좌상
  ];

  const maxVal = Math.max(...AXES.map(a => wuxing[a.key] ?? 0), 1);

  const toXY = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  };

  // 배경 격자 (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPolygons = gridLevels.map(level =>
    AXES.map(a => { const p = toXY(a.angleDeg, R * level); return `${p.x},${p.y}`; }).join(' ')
  );

  // 데이터 폴리곤
  const dataPoints = AXES.map(a => {
    const val = wuxing[a.key] ?? 0;
    const ratio = val / maxVal;
    return toXY(a.angleDeg, R * Math.max(ratio, 0.05));
  });
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  // 라벨 위치 (축 끝 살짝 밖)
  const LABEL_R = R + 14;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[160px] mx-auto">
      {/* 배경 격자 */}
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts}
          fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth={i === gridPolygons.length - 1 ? 0.8 : 0.5} />
      ))}
      {/* 축 선 */}
      {AXES.map((a) => {
        const end = toXY(a.angleDeg, R);
        return <line key={a.key} x1={CX} y1={CY} x2={end.x} y2={end.y}
          stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />;
      })}
      {/* 데이터 채우기 */}
      <polygon points={dataPolygon}
        fill="rgba(201,168,76,0.12)"
        stroke="rgba(201,168,76,0.6)"
        strokeWidth={1.5} />
      {/* 데이터 포인트 */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3}
          fill={AXES[i].color}
          stroke="rgba(13,13,26,0.8)" strokeWidth={1} />
      ))}
      {/* 라벨 */}
      {AXES.map((a) => {
        const lp = toXY(a.angleDeg, LABEL_R);
        const val = wuxing[a.key] ?? 0;
        return (
          <g key={a.key}>
            <text x={lp.x} y={lp.y - 3} textAnchor="middle" dominantBaseline="middle"
              fontSize={10} fontWeight="600" fill={a.color}>{a.label}</text>
            <text x={lp.x} y={lp.y + 8} textAnchor="middle" dominantBaseline="middle"
              fontSize={8} fill="rgba(255,255,255,0.45)">{val}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── TOP5 리스트 ─────────────────────────────────────────────────────
function MomentList({ items, type }: { items: LifeMoment[]; type: 'peak' | 'hard' }) {
  const isPeak  = type === 'peak';
  const accent  = isPeak ? '#c9a84c' : '#e05252';
  const bgBase  = isPeak ? 'rgba(201,168,76,0.06)' : 'rgba(224,82,82,0.06)';
  const icons   = isPeak ? ['🌟','✨','⭐','💫','🌙'] : ['⚡','🌧','🔥','💨','🌊'];

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl px-4 py-3 flex gap-3 items-start"
          style={{ background: bgBase, border: `1px solid ${accent}18` }}>
          <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base"
            style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
            {icons[i]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold" style={{ color: accent }}>{item.timing}</span>
              <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 현재 라벨 탐색 ─────────────────────────────────────────────────
function findCurrentLabel(graph: GraphPeriod[] | undefined, currentAge: number): string | undefined {
  if (!graph || graph.length === 0) return undefined;
  // "23~32세" 형식에서 startAge~endAge 파싱
  for (const g of graph) {
    const m = g.label.match(/^(\d+)~(\d+)세$/);
    if (m) {
      const start = Number(m[1]);
      const end = Number(m[2]);
      if (currentAge >= start && currentAge <= end) return g.label;
    }
  }
  // 파싱 불가 시 기존 라벨 매칭 시도 (하위 호환)
  return graph.find(g => g.label.includes(
    currentAge < 25 ? '20대 초반' : currentAge < 30 ? '20대 후반'
    : currentAge < 35 ? '30대 초반' : currentAge < 40 ? '30대 후반'
    : currentAge < 45 ? '40대 초반' : currentAge < 50 ? '40대 후반' : '50대'
  ))?.label;
}

// ─── 메인 ────────────────────────────────────────────────────────────
function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const name   = searchParams.get('name')   ?? '';
  const year   = searchParams.get('year')   ?? '';
  const month  = searchParams.get('month')  ?? '';
  const day    = searchParams.get('day')    ?? '';
  const hour   = searchParams.get('hour')   ?? '12';
  const minute = searchParams.get('minute') ?? '0';
  const gender = searchParams.get('gender') ?? 'M';
  const city   = searchParams.get('city')   ?? 'seoul';

  const birthParams: SamsinInput = {
    name, gender: gender === 'F' ? 'F' : 'M',
    year: Number(year), month: Number(month), day: Number(day),
    hour: Number(hour), minute: Number(minute),
    city,
  };

  // 현재 나이대 라벨 — 새 포맷("23~32세")에서 현재 나이 구간 탐색
  const currentYear = new Date().getFullYear();
  const age = currentYear - Number(year);

  const [loadingStep, setLoadingStep]     = useState(0);
  const [report, setReport]               = useState<TotalReport | null>(null);
  const [meta, setMeta]                   = useState<ReportMeta | null>(null);
  const [error, setError]                 = useState('');
  const [visibleSections, setVisibleSections] = useState(0);

  const [deepData, setDeepData]         = useState<Record<string, DeepSection[]>>({});
  const [deepLoading, setDeepLoading]   = useState<Record<string, boolean>>({});

  const [finalSynthesis, setFinalSynthesis]       = useState<FinalSynthesis | null>(null);
  const [finalLoading, setFinalLoading]           = useState(false);
  const [consensusMetrics, setConsensusMetrics]   = useState<ConsensusMetrics | null>(null);

  const [reportContext, setReportContext] = useState<ReportContext>({});

  const [showShop, setShowShop] = useState(false);
  const [showChat, setShowChat] = useState(false);


  useEffect(() => {
    if (!name || !year) return;
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 900);

    fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, year, month, day, hour, minute, gender, city }),
    })
      .then(r => r.json())
      .then(data => {
        clearInterval(interval);
        if (data.error) { setError(data.error); return; }
        setReport(data.report);
        setMeta(data.meta);
        if (data.consensusMetrics) setConsensusMetrics(data.consensusMetrics);
        // reportContext 누적
        if (data.report) {
          const r = data.report;
          const moneyNotes = (r.moneyGraph ?? []).map((g: GraphPeriod) => `${g.label}: ${g.score}점`).join(', ');
          const careerNotes = (r.careerGraph ?? []).map((g: GraphPeriod) => `${g.label}: ${g.score}점`).join(', ');
          setReportContext(prev => ({
            ...prev,
            totalReport: {
              coreInsightHeadline: r.coreInsight?.headline ?? '',
              coreInsightBody: r.coreInsight?.body ?? '',
              samsinMessage: r.samsinMessage ?? '',
              moneyGraphSummary: moneyNotes,
              careerGraphSummary: careerNotes,
            },
          }));
        }
      })
      .catch(() => { clearInterval(interval); setError('오류가 발생했습니다.'); });

    return () => clearInterval(interval);
  }, [name, year, month, day, hour, minute, gender]);

  useEffect(() => {
    if (!report) return;
    const timer = setInterval(() => {
      setVisibleSections(prev => { if (prev < 10) return prev + 1; clearInterval(timer); return prev; });
    }, 250);
    return () => clearInterval(timer);
  }, [report]);

  const handleDeepUnlock = async (charKey: 'cheongwoon' | 'taeeul' | 'luna') => {
    if (deepData[charKey]) return;
    setDeepLoading(prev => ({ ...prev, [charKey]: true }));
    try {
      const res = await fetch('/api/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character: charKey, name, year, month, day, hour, minute, gender, city }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeepData(prev => ({ ...prev, [charKey]: data.report.sections }));
    } catch (err) {
      console.error(err);
    } finally {
      setDeepLoading(prev => ({ ...prev, [charKey]: false }));
    }
  };

  const handleFinalSynthesis = async () => {
    if (finalSynthesis || finalLoading) return;
    setFinalLoading(true);
    try {
      const res = await fetch('/api/final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, year, month, day, hour, minute, gender, city,
          moneyGraph: report?.moneyGraph,
          careerGraph: report?.careerGraph,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFinalSynthesis(data.synthesis);
      if (data.consensusMetrics) setConsensusMetrics(data.consensusMetrics);
      // reportContext 누적 — 합의 판결
      if (data.synthesis) {
        const s = data.synthesis;
        const prescriptionSummary = s.prescription
          ? `색: ${s.prescription.luckyColor?.name}, 방향: ${s.prescription.luckyDirection?.name}, 숫자: ${s.prescription.luckyNumber?.value}`
          : '';
        setReportContext(prev => ({
          ...prev,
          finalSynthesis: {
            verdict: s.verdict ?? '',
            consensusLevel: s.consensusLevel ?? 'majority',
            consensusNote: s.consensusNote ?? '',
            nowAdvice: s.nowAdvice ?? '',
            prescription: prescriptionSummary,
            seal: s.seal ?? '',
          },
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFinalLoading(false);
    }
  };

  const inviteUrl = typeof window !== 'undefined'
    ? buildInviteUrl(birthParams, window.location.origin) : '';

  const handleInvite = () => {
    if (navigator.share) {
      navigator.share({ title: '삼신사주 궁합', text: `${name}님이 궁합을 요청했습니다`, url: inviteUrl });
    } else {
      navigator.clipboard.writeText(inviteUrl).then(() => alert('링크가 복사되었습니다.'));
    }
  };

  if (!report && !error) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center px-4">
        <StarsBg />
        <div className="relative z-10 text-center space-y-10">
          <div className="flex justify-center gap-8">
            {CHARACTERS.map((c, i) => (
              <div key={c.name} className="animate-float flex flex-col items-center gap-2"
                style={{ animationDelay: `${i * 0.5}s` }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: `radial-gradient(circle, ${c.color}20, transparent)`, border: `1px solid ${c.color}40` }}>
                  {c.emoji}
                </div>
                <span className="text-xs font-semibold" style={{ color: c.color }}>{c.name}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full border-2 mx-auto animate-spin"
              style={{ borderColor: 'rgba(201,168,76,0.3)', borderTopColor: '#c9a84c' }} />
            <p className="text-sm" style={{ color: 'var(--gold)' }}>{LOADING_MESSAGES[loadingStep]}</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center px-4">
        <StarsBg />
        <div className="relative z-10 text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <button onClick={() => router.push('/')} className="text-sm underline" style={{ color: 'var(--gold)' }}>
            처음으로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <CookieBar onShopClick={() => setShowShop(true)} />

      <main className="relative min-h-screen px-4 pt-14 pb-28">
        <StarsBg />
        <div className="relative z-10 max-w-lg mx-auto space-y-5">

          {/* 헤더 */}
          <div className="text-center space-y-2 pt-4 animate-fade-up">
            <p className="text-xs tracking-widest" style={{ color: 'var(--text-muted)' }}>삼신사주 · 총운 리포트</p>
            <h1 className="text-2xl font-bold gold-gradient">{meta?.name}님의 천명서</h1>
            {meta?.dayPillar && (
              <p className="text-sm" style={{ color: 'var(--silver)' }}>
                일주(日柱) <span style={{ color: 'var(--gold)' }}>{meta.dayPillar}</span>
              </p>
            )}
          </div>

          {/* 세 신 — 첫 마디 */}
          {visibleSections >= 1 && report?.characterVoices && (
            <div className="space-y-2 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
              {CHARACTERS.map(c => (
                <div key={c.charKey} className="rounded-2xl px-4 py-3 flex gap-3 items-start"
                  style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${c.color}18` }}>
                  <span className="text-base mt-0.5 shrink-0">{c.emoji}</span>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold" style={{ color: c.color }}>{c.name}</span>
                    <p className="text-sm leading-relaxed mt-0.5" style={{ color: 'var(--silver)' }}>
                      {report.characterVoices![c.charKey as keyof typeof report.characterVoices]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 오행 분포 — 오각형 레이더 */}
          {meta?.wuxing && visibleSections >= 2 && (
            <div className="card-dark p-4 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
              <p className="text-xs mb-3 text-center" style={{ color: 'var(--text-muted)' }}>오행 분포</p>
              <WuxingRadar wuxing={meta.wuxing} />
            </div>
          )}

          {/* 핵심 교집합 */}
          {report?.coreInsight && visibleSections >= 3 && (
            <div className="card-dark p-5 animate-fade-up" style={{
              animationFillMode: 'forwards',
              borderColor: 'rgba(201,168,76,0.3)',
              background: 'linear-gradient(135deg, rgba(201,168,76,0.05), rgba(13,13,26,0.95))',
            }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🌿 ☁️ ✦</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>세 신의 교집합</span>
              </div>
              <p className="text-base font-bold mb-2" style={{ color: 'var(--gold)' }}>
                {report.coreInsight.headline}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--silver)' }}>
                {report.coreInsight.body}
              </p>
            </div>
          )}

          {/* 금전운 그래프 */}
          {report?.moneyGraph && visibleSections >= 4 && (
            <div className="card-dark p-5 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>💰 금전운 흐름</p>
              <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>막대에 커서를 올리면 설명이 나옵니다</p>
              <RuneGraph data={report.moneyGraph} color="#c9a84c" currentLabel={findCurrentLabel(report.moneyGraph, age)} />
            </div>
          )}

          {/* 직업 성장 그래프 */}
          {report?.careerGraph && visibleSections >= 5 && (
            <div className="card-dark p-5 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>🧭 직업 성장 흐름</p>
              <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>현재 시기는 밝게 표시됩니다</p>
              <RuneGraph data={report.careerGraph} color="#a78bfa" currentLabel={findCurrentLabel(report.careerGraph, age)} />
            </div>
          )}

          {/* 인생 최고의 순간 TOP 5 */}
          {report?.peakMoments && visibleSections >= 6 && (
            <div className="card-dark p-5 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
              <p className="text-xs mb-3 font-semibold" style={{ color: '#c9a84c' }}>
                🌟 인생 최고의 순간 TOP 5
              </p>
              <MomentList items={report.peakMoments} type="peak" />
            </div>
          )}

          {/* 힘든 고비 TOP 5 */}
          {report?.hardMoments && visibleSections >= 7 && (
            <div className="card-dark p-5 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
              <p className="text-xs mb-3 font-semibold" style={{ color: '#e05252' }}>
                ⚡ 반드시 알아야 할 고비 TOP 5
              </p>
              <MomentList items={report.hardMoments} type="hard" />
            </div>
          )}

          {/* 세 신의 당부 */}
          {visibleSections >= 8 && (
            <div className="card-dark p-5 text-center animate-fade-up" style={{
              animationFillMode: 'forwards',
              borderColor: 'rgba(201,168,76,0.4)',
              background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(13,13,26,1))',
            }}>
              <div className="flex justify-center gap-3 mb-3 text-lg">
                {CHARACTERS.map(c => <span key={c.name}>{c.emoji}</span>)}
              </div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>세 신이 전하는 예언</p>
              <p className="text-xl font-bold gold-gradient leading-snug">
                &ldquo;{report!.samsinMessage}&rdquo;
              </p>
            </div>
          )}

          {/* 심층 분석 */}
          {visibleSections >= 9 && (
            <div className="space-y-4 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
              <div className="text-center">
                <p className="text-xs tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>── 심층 분석 ──</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>각 신의 관점에서 더 깊이 들어갑니다</p>
              </div>

              {CHARACTERS.map(c => (
                <div key={c.charKey} className="card-dark overflow-hidden"
                  style={{ borderColor: `${c.color}25` }}>
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2"
                    style={{ borderBottom: `1px solid ${c.color}15` }}>
                    <span className="text-lg">{c.emoji}</span>
                    <span className="text-sm font-semibold" style={{ color: c.color }}>{c.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.title} 심층</span>
                  </div>

                  <div className="px-5 py-4">
                    {deepData[c.charKey] ? (
                      <div className="space-y-4">
                        {deepData[c.charKey].map((sec, i) => (
                          <div key={i}>
                            <p className="text-xs font-semibold mb-1" style={{ color: c.color }}>{sec.title}</p>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--silver)' }}>{sec.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : deepLoading[c.charKey] ? (
                      <div className="space-y-2 py-2">
                        {[70, 85, 60].map((w, i) => (
                          <div key={i} className="h-3 rounded animate-pulse"
                            style={{ background: `${c.color}15`, width: `${w}%` }} />
                        ))}
                        <p className="text-xs text-center mt-2" style={{ color: c.color }}>{c.name} 분석 중...</p>
                      </div>
                    ) : (
                      <div className="text-center py-3 space-y-3">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.name}의 시선으로 더 깊이 들어갑니다</p>
                        <button onClick={() => handleDeepUnlock(c.charKey)}
                          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                          style={{ background: `${c.color}15`, border: `1px solid ${c.color}40`, color: c.color }}>
                          심층 분석 열기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 삼신합의 최종 종합 */}
          {visibleSections >= 10 && (
            <div className="animate-fade-up" style={{ animationFillMode: 'forwards' }}>
              {!finalSynthesis && !finalLoading ? (
                <button onClick={handleFinalSynthesis}
                  className="w-full py-5 rounded-2xl text-sm font-bold tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(76,168,125,0.12), rgba(167,139,250,0.12), rgba(201,168,76,0.12))',
                    border: '1px solid rgba(201,168,76,0.4)',
                    color: 'var(--gold)',
                  }}>
                  <span className="flex items-center justify-center gap-2">
                    <span>🌿 ☁️ ✦</span>
                    <span>삼신합의 최종 판결 받기</span>
                  </span>
                  <p className="text-[10px] mt-1 font-normal" style={{ color: 'var(--text-muted)' }}>
                    세 신이 한자리에 모여 최종 합의를 내립니다
                  </p>
                </button>
              ) : finalLoading ? (
                <div className="card-dark p-8 text-center space-y-4"
                  style={{ borderColor: 'rgba(201,168,76,0.3)' }}>
                  <div className="flex justify-center gap-4 text-2xl animate-pulse">
                    <span>🌿</span><span>☁️</span><span>✦</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--gold)' }}>세 신이 최종 합의를 나누고 있습니다...</p>
                  <div className="w-8 h-8 rounded-full border-2 mx-auto animate-spin"
                    style={{ borderColor: 'rgba(201,168,76,0.3)', borderTopColor: '#c9a84c' }} />
                </div>
              ) : finalSynthesis && (() => {
                const cLevel = finalSynthesis.consensusLevel ?? consensusMetrics?.level ?? 'majority';
                const sealClass = cLevel === 'unanimous' ? 'seal-unanimous'
                  : cLevel === 'conflict' ? 'seal-conflict' : 'seal-majority';
                const badgeLabel = cLevel === 'unanimous' ? '만장일치' : cLevel === 'conflict' ? '격론' : '다수 동의';
                const badgeIcon = cLevel === 'unanimous' ? '🟡' : cLevel === 'conflict' ? '🔴' : '⚪';

                return (
                <div className="space-y-4">
                  {/* 헤더 + 합의 배지 */}
                  <div className="text-center space-y-1">
                    <div className="flex justify-center gap-3 text-xl mb-2">
                      <span>🌿</span><span>☁️</span><span>✦</span>
                    </div>
                    <p className="text-xs tracking-widest" style={{ color: 'var(--text-muted)' }}>── 삼신합의 최종 판결 ──</p>
                    <div className="flex justify-center mt-2">
                      <span className={`consensus-badge ${cLevel}`}>
                        {badgeIcon} {badgeLabel}
                        {consensusMetrics && <span className="ml-1 opacity-70">{consensusMetrics.alignmentScore}점</span>}
                      </span>
                    </div>
                    {finalSynthesis.consensusNote && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        {finalSynthesis.consensusNote}
                      </p>
                    )}
                  </div>

                  {/* 합의 판결 — conflict 시 3컬럼 격론 */}
                  {cLevel === 'conflict' ? (
                    <div className="space-y-3">
                      <p className="text-xs text-center" style={{ color: '#e05252' }}>세 신의 견해가 갈립니다</p>
                      <div className="grid grid-cols-3 gap-2">
                        {CHARACTERS.map(c => (
                          <div key={c.charKey} className="card-dark p-3 text-center"
                            style={{ borderColor: `${c.color}30` }}>
                            <span className="text-lg">{c.emoji}</span>
                            <p className="text-[10px] font-semibold mt-1" style={{ color: c.color }}>{c.name}</p>
                            <p className="text-[10px] mt-1 leading-snug" style={{ color: 'var(--silver)' }}>
                              {finalSynthesis.voices[c.charKey as keyof typeof finalSynthesis.voices]}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="card-dark p-5"
                      style={{
                        background: 'linear-gradient(135deg, rgba(201,168,76,0.07), rgba(13,13,26,0.98))',
                        borderColor: cLevel === 'unanimous' ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.35)',
                      }}>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>세 신의 합의 판결</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--silver)' }}>
                        {finalSynthesis.verdict}
                      </p>
                    </div>
                  )}

                  {/* 반론 카드 — majority 시 dissent */}
                  {cLevel === 'majority' && finalSynthesis.dissent && (
                    <div className="card-dark p-4" style={{ borderColor: 'rgba(224,82,82,0.2)', background: 'rgba(224,82,82,0.03)' }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: '#e05252' }}>
                        반론 — {finalSynthesis.dissent.voice === 'cheongwoon' ? '청운' : finalSynthesis.dissent.voice === 'taeeul' ? '태을' : '루나'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {finalSynthesis.dissent.argument}
                      </p>
                    </div>
                  )}

                  {/* 운명의 세 기둥 */}
                  <div className="space-y-3">
                    {finalSynthesis.pillars.map((p, i) => (
                      <div key={i} className="card-dark p-4 flex gap-3 items-start"
                        style={{
                          borderColor: i === 0 ? 'rgba(76,168,125,0.3)'
                            : i === 1 ? 'rgba(167,139,250,0.3)'
                            : 'rgba(201,168,76,0.3)',
                        }}>
                        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg"
                          style={{
                            background: i === 0 ? 'rgba(76,168,125,0.12)'
                              : i === 1 ? 'rgba(167,139,250,0.12)'
                              : 'rgba(201,168,76,0.12)',
                          }}>
                          {p.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold mb-1"
                            style={{
                              color: i === 0 ? '#4ca87d' : i === 1 ? '#a78bfa' : '#c9a84c',
                            }}>
                            {p.title}
                          </p>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--silver)' }}>
                            {p.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 지금 이 시기 처방 */}
                  <div className="card-dark p-5"
                    style={{ borderColor: 'rgba(167,139,250,0.25)' }}>
                    <p className="text-xs mb-2" style={{ color: '#a78bfa' }}>지금 이 시기의 합의 처방</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--silver)' }}>
                      {finalSynthesis.nowAdvice}
                    </p>
                  </div>

                  {/* 처방전 카드 */}
                  {finalSynthesis.prescription && (
                    <PrescriptionCard prescription={finalSynthesis.prescription} />
                  )}

                  {/* 세 신의 마지막 목소리 — conflict가 아닐 때만 (conflict는 위에서 이미 표시) */}
                  {cLevel !== 'conflict' && (
                    <div className="space-y-2">
                      {CHARACTERS.map(c => (
                        <div key={c.charKey} className="rounded-2xl px-4 py-3 flex gap-3 items-start"
                          style={{ background: `${c.color}08`, border: `1px solid ${c.color}20` }}>
                          <span className="text-base mt-0.5 shrink-0">{c.emoji}</span>
                          <div className="min-w-0">
                            <span className="text-[11px] font-semibold" style={{ color: c.color }}>{c.name}</span>
                            <p className="text-sm leading-relaxed mt-0.5" style={{ color: 'var(--silver)' }}>
                              {finalSynthesis.voices[c.charKey as keyof typeof finalSynthesis.voices]}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 옥새 — 합의 강도별 애니메이션 */}
                  <div className="card-dark p-6 text-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(76,168,125,0.06), rgba(167,139,250,0.06), rgba(201,168,76,0.06))',
                      border: '1px solid',
                      borderImage: 'linear-gradient(135deg, #4ca87d55, #a78bfa55, #c9a84c55) 1',
                      borderRadius: 16,
                    }}>
                    <div className="flex justify-center gap-2 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                      <span>─</span><span>옥새</span><span>─</span>
                    </div>
                    <p className={`text-xl font-bold leading-snug ${sealClass}`}>
                      &ldquo;{finalSynthesis.seal}&rdquo;
                    </p>
                  </div>
                </div>
                );
              })()}
            </div>
          )}

          {/* CTA */}
          {visibleSections >= 10 && (
            <div className="space-y-3 pt-2 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
              <button onClick={handleInvite}
                className="w-full py-4 rounded-xl text-sm font-bold tracking-wide transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #b8933e, #e8c97a, #b8933e)', color: '#06060f' }}>
                💌 궁합 보기 — 상대방 초대
              </button>
              <button onClick={() => router.push('/')}
                className="w-full py-3 rounded-xl text-xs transition-all hover:opacity-60"
                style={{ color: 'var(--text-muted)' }}>
                ← 다시 입력하기
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 채팅 FAB */}
      {report && (
        <button onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-xl transition-all hover:scale-110"
          style={{ background: 'linear-gradient(135deg, #4ca87d, #a78bfa)', boxShadow: '0 0 20px rgba(76,168,125,0.4)' }}>
          🌿
        </button>
      )}

      {showShop && <CookieShopModal onClose={() => setShowShop(false)} />}
      {showChat && (
        <ChatModal
          params={{ name, year, month, day, hour, minute, gender, city }}
          onClose={() => setShowChat(false)}
          onNeedCookies={() => { setShowChat(false); setShowShop(true); }}
          reportContext={reportContext}
        />
      )}
    </>
  );
}

export default function ReportPage() {
  return <Suspense><ReportContent /></Suspense>;
}
