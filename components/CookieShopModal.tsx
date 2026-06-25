'use client';

import { useState } from 'react';
import { addCookies, getCookieCount } from '@/lib/cookies';
import {
  DEEP_BUNDLE_COST,
  FIRST_READING_COST,
  MONTHLY_REPORT_COST,
  PRODUCT_COOKIE_COSTS,
  formatCookieValue,
  type ProductId,
} from '@/lib/pricing';

const PACKAGES = [
  {
    amount: FIRST_READING_COST,
    title: '세 관점 보기',
    desc: '돈·일의 공통 신호, 관점 차이, 오늘의 기준',
    badge: '990원',
  },
  {
    amount: DEEP_BUNDLE_COST,
    title: '깊게 보기',
    desc: '세부 이유, 반론, 다음 30일 기준, 마지막 정리',
    badge: '3,000원',
  },
  {
    amount: MONTHLY_REPORT_COST,
    title: '월간/신년 리포트',
    desc: '시즌 리포트와 반복 점검 후보',
    badge: '9,900원',
  },
];

const PRODUCT_LABELS: Partial<Record<ProductId, string>> = {
  first_reading: '세 관점 보기',
  deep_bundle: '깊게 보기',
  compatibility: '궁합 보기',
  chat_single_deity: '한 관점 질문',
  chat_trinity: '세 관점 질문',
  chat_deep_session: '깊게 묻기',
  monthly_report: '월간/신년 리포트',
};

const PRODUCT_DETAILS: Partial<Record<ProductId, { opens: string; locked: string }>> = {
  first_reading: {
    opens: '일과 돈에서 겹치는 신호, 갈리는 해석, 오늘 잡을 기준을 사주·자미·점성 세 관점으로 나눠 봅니다.',
    locked: '각 관점의 세부 이유와 마지막 정리는 깊게 보기에 남겨둡니다.',
  },
  deep_bundle: {
    opens: '세 관점의 세부 이유, 반론, 다음 30일 기준, 마지막 정리까지 엽니다.',
    locked: '궁합과 월간/신년 리포트는 별도 상품입니다.',
  },
  compatibility: {
    opens: '두 사람의 오행, 속도, 관계 리듬을 함께 비교합니다.',
    locked: '각자의 개인 리포트 깊게 보기는 별도 상품입니다.',
  },
  chat_single_deity: {
    opens: '청운·태을·루나 중 한 관점으로 이어 묻습니다.',
    locked: '세 관점 동시 답변과 깊게 묻기는 더 높은 질문 모드입니다.',
  },
  chat_trinity: {
    opens: '방금 본 리포트 맥락을 세 관점으로 이어 묻습니다.',
    locked: '반론과 이번 주 선택 기준은 깊게 묻기에 포함됩니다.',
  },
  chat_deep_session: {
    opens: '반론, 이번 주 선택 기준, 세 관점의 추가 해석까지 포함합니다.',
    locked: '궁합과 월간/신년 리포트는 별도 상품입니다.',
  },
  monthly_report: {
    opens: '월간 또는 신년 흐름을 별도 리포트로 확인합니다.',
    locked: '궁합과 질문 상품은 별도 상품입니다.',
  },
};

function hasFinalConsonant(text: string): boolean {
  const lastHangul = [...text].reverse().find(char => {
    const code = char.charCodeAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
  });
  if (!lastHangul) return false;
  return (lastHangul.charCodeAt(0) - 0xac00) % 28 !== 0;
}

function withObjectParticle(text: string): string {
  return `${text}${hasFinalConsonant(text) ? '을' : '를'}`;
}

export interface CookieShopContext {
  productId?: ProductId;
  title?: string;
  requiredCookie?: number;
}

interface Props {
  onClose: () => void;
  context?: CookieShopContext;
  onBought?: (balance: number, amount: number) => number | void;
}

export default function CookieShopModal({ onClose, context, onBought }: Props) {
  const [bought, setBought] = useState<number | null>(null);
  const [balance, setBalance] = useState(() => getCookieCount());
  const requiredCookie = context?.requiredCookie ?? (context?.productId ? PRODUCT_COOKIE_COSTS[context.productId] : undefined);
  const productTitle = context?.title ?? (context?.productId ? PRODUCT_LABELS[context.productId] : undefined);
  const productDetail = context?.productId ? PRODUCT_DETAILS[context.productId] : undefined;
  const deficit = requiredCookie === undefined ? 0 : Math.max(0, requiredCookie - balance);
  const recommendedAmount = deficit > 0
    ? PACKAGES.find(pkg => pkg.amount >= deficit)?.amount ?? MONTHLY_REPORT_COST
    : undefined;
  const productPackageTitle = productTitle && requiredCookie ? productTitle : undefined;
  const productPackageDesc = productDetail?.opens;

  const handleBuy = (amount: number) => {
    const next = addCookies(amount);
    const adjustedBalance = onBought?.(next, amount);
    const currentBalance = typeof adjustedBalance === 'number' ? adjustedBalance : getCookieCount();
    setBalance(currentBalance);
    setBought(currentBalance);
    setTimeout(() => {
      onClose();
      setBought(null);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgba(29,25,20,0.34)] p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="panel-strong max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-b-none p-5 sm:rounded-b-lg"
        onClick={event => event.stopPropagation()}
      >
        {bought !== null ? (
          <div className="py-8 text-center">
            <p className="section-label">충전 완료</p>
            <h2 className="title-tight mt-2">준비됐어요</h2>
            <p className="body-copy mt-3">
              {productTitle
                ? `${productTitle}에 필요한 쿠키가 준비됐어요.`
                : `현재 ${bought}쿠키 보유`}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-label">쿠키 충전</p>
                <h2 className="title-tight mt-1">
                  {productTitle ? `${productTitle}에 필요한 만큼만` : '필요한 만큼만 충전'}
                </h2>
              </div>
              <button type="button" onClick={onClose} className="btn-ghost !min-h-8 !px-2">닫기</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
                <p className="section-label">보유 쿠키</p>
                <p className="mt-1 text-xl font-black text-[var(--green)]">{balance}쿠키</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
                <p className="section-label">{requiredCookie === undefined ? '단가' : '필요한 쿠키'}</p>
                <p className="mt-1 text-xl font-black text-[var(--blue)]">
                  {requiredCookie === undefined ? '330원' : `${requiredCookie}쿠키`}
                </p>
              </div>
            </div>

            {productDetail && (
              <div className="mt-3 grid gap-2">
                <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
                  <p className="section-label">지금 열리는 것</p>
                  <p className="muted-copy mt-1">{productDetail.opens}</p>
                </div>
                <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
                  <p className="section-label">아직 잠긴 것</p>
                  <p className="muted-copy mt-1">{productDetail.locked}</p>
                </div>
              </div>
            )}

            {requiredCookie !== undefined && (
              <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black text-[var(--ink)]">
                    {deficit > 0 ? '부족한 쿠키' : '바로 볼 수 있어요'}
                  </p>
                  <span className={`chip ${deficit > 0 ? 'chip-gold' : 'chip-green'}`}>
                    {deficit > 0 ? `${deficit}쿠키 부족` : '충전 불필요'}
                  </span>
                </div>
                <p className="muted-copy mt-1">
                  {deficit > 0
                    ? `${formatCookieValue(deficit)}만큼 더 있으면 ${withObjectParticle(productTitle ?? '선택한 내용')} 열 수 있어요.`
                    : '이미 필요한 쿠키가 있어서 결제 없이 이어갈 수 있어요.'}
                </p>
              </div>
            )}

            <p className="body-copy mt-4">
              {productTitle && requiredCookie
                ? `${productTitle}는 ${requiredCookie}쿠키예요. 지금은 실제 결제 없이 쿠키 흐름만 확인합니다.`
                : '세 관점 보기는 3쿠키, 깊게 보기는 9쿠키예요. 지금은 실제 결제 없이 쿠키 흐름만 확인합니다.'}
            </p>

            <div className="mt-5 space-y-3">
              {PACKAGES.map(pkg => {
                const isRecommended = recommendedAmount === pkg.amount;
                const title = isRecommended && productPackageTitle ? productPackageTitle : pkg.title;
                const desc = isRecommended && productPackageDesc ? productPackageDesc : pkg.desc;

                return (
                  <button key={pkg.amount} type="button" onClick={() => handleBuy(pkg.amount)} className="panel-flat w-full p-4 text-left transition hover:opacity-80">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black">{title}</p>
                          <span className="chip chip-gold">{pkg.badge}</span>
                          {isRecommended && <span className="chip chip-green">추천</span>}
                        </div>
                        <p className="muted-copy mt-1">{desc}</p>
                      </div>
                      <span className="text-sm font-black text-[var(--green)]">{pkg.amount}쿠키</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="muted-copy mt-4">
              내용을 불러오지 못하면 사용한 쿠키는 돌려받습니다. 데모 버전이라 실제 결제는 없어요.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
