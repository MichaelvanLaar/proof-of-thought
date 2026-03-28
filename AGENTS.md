# Project: proof-of-thought

TypeScript port of ProofOfThought — neurosymbolic reasoning combining LLMs with Z3 theorem proving.
Published as `@michaelvanlaar/proof-of-thought` on npm.

## Stack

TypeScript 5, Node.js 18+, Z3 solver (native + WASM), OpenAI SDK, Vitest, esbuild, ESLint/Prettier, Husky.

## Architecture

Two-layer design: high-level API (`src/reasoning/`) + backend layer (`src/backends/`).
Dual Z3 adapters: native for Node.js, WASM for browsers (`src/adapters/`).
Postprocessing pipeline in `src/postprocessing/`.

## Conventions

- Conventional Commits with gitmoji.
- Strict TypeScript — no `any` types.
- All public APIs documented with JSDoc.
- Tests via Vitest; run `npm run ci` for full validation.

## OpenSpec

This project uses OpenSpec for structured change management. See `openspec/config.yaml`.
