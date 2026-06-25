# Contributing to Samsin Saju

Thank you for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/[username]/samsin-saju.git
cd samsin-saju
npm install
cp env.example .env.local   # add your OPENROUTER_API_KEY
npm run dev
```

## What We Welcome

- Bug fixes
- Improved astrological domain knowledge (`lib/domain-knowledge.ts`)
- New UI components or improved mobile experience
- Additional language support (currently Korean-primary)
- Performance optimizations for the multi-model consensus pipeline
- Test coverage for astronomical calculation utilities

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes and ensure `npm run build` passes
3. Run type check: `npx tsc --noEmit`
4. Open a PR with a clear description of what and why

## Astrological Accuracy

This project takes astrological tradition seriously. Changes to:
- `lib/domain-knowledge.ts`
- `lib/saju.ts` / `lib/ziwei-core.ts` / `lib/natal-core.ts`
- Any AI prompt in `lib/claude.ts`

...should include a rationale referencing the specific tradition's source material or calculation method.

## Code Style

- TypeScript strict mode
- No `any` types without a comment explaining why
- Keep AI prompts in `lib/claude.ts` — no inline prompts in components

## License

By contributing, you agree your contributions are licensed under the MIT License.
