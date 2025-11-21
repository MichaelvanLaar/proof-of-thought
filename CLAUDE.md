<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript port of [ProofOfThought](https://github.com/DebarghaG/proofofthought), implementing the neurosymbolic program synthesis approach described in the paper "Proof of Thought: Neurosymbolic Program Synthesis allows Robust and Interpretable Reasoning."

The goal is to provide the same functionality as the original Python implementation but for the Node.js/TypeScript ecosystem.

## Project Status

This is a new repository. The TypeScript implementation has not yet been started. When implementing:

1. Study the original Python implementation at https://github.com/DebarghaG/proofofthought to understand the architecture
2. Maintain API compatibility where reasonable while following TypeScript/Node.js conventions
3. The package should be usable in both Node.js and browser environments where possible

## GitHub Integration

This repository uses Claude Code GitHub Actions:

- **@claude trigger**: The `claude.yml` workflow responds to `@claude` mentions in issues, PRs, and comments
- **PR Reviews**: The `claude-code-review.yml` workflow automatically reviews pull requests for code quality, bugs, performance, security, and test coverage

When working on PRs, ensure changes align with the review criteria defined in the workflows.

## Original Python Reference

The original implementation should be consulted for:

- Algorithm design and neurosymbolic reasoning approach
- API surface and expected functionality
- Test cases and expected behavior

The TypeScript port should maintain conceptual compatibility while adopting TypeScript idioms and type safety.

## Notes

- Always use Conventional Commits and gitmoji when creating git commit messages.
