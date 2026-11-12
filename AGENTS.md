# Master Agent Directives

## Master Specifications & Rulesets
- Strictly adhere to `plan.md` in the repository root (defines architectural boundaries, schemas, and sponsor requirements).
- Strictly adhere to `Gemini.md` in the repository root (local persistent knowledge base, operational rules, and golden issue templates).
- When taking action, auditing, or editing files, always align with `Gemini.md` directives.

## Build, Testing & Verification Constraints
- Package Manager: `pnpm` (Workspace-enabled)
- Never flatten monorepo boundaries or put cross-package dependencies into root `package.json`.
- Keep sensitive credentials in `.env.example` templates; never commit hardcoded tokens.
- **Skip Redundant Test/Build on Pre-Verified Automation:** Do NOT run redundant `pnpm build` or `pnpm test` cycles if incoming code, commits, or PRs were already built, tested, and validated by an upstream automated system (such as Jules before submitting PRs, GitHub Actions CI, or automated Git merge runners). Use direct `git diff` code inspection to verify correctness. Only run local builds or tests when making new local source modifications or when explicitly requested by the user.

## Git Branching, Worktree Isolation & Push Constraints
- **Primary Working Branch is `main` (for Main Agent):** All active development on the primary repo root MUST be made to `main`.
- **Worktree Isolation (for Secondary Agents):** Agents operating inside git worktrees (`agpay1`, `agpay2`, `agpay3`, etc.) MUST **ONLY commit to their own assigned worktree branch** (e.g., `agent-1`, `agent-2`). They must NEVER commit directly to `main` or push to `main`.
- **Strictly NO Merging Without Explicit Instruction:** Never merge worktree branches into `main` unless the user explicitly gives a direct instruction to merge.
- **Mandatory Detailed Commit Summaries:** In EVERY commit, provide a clear, descriptive summary of what was added or modified.
- **Strictly Do NOT Push to Secondary Branches (`render-free`):** Never commit or push to `render-free` (or any other branch) unless the user explicitly instructs to push to that specific branch, or when specifically tasked with fixing an issue unique to that branch. `render-free` is strictly a downstream mirror for running single-server free-tier deployments.
