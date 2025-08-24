# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

While this project uses React, Vite supports many popular JS frameworks. [See all the supported frameworks](https://vitejs.dev/guide/#scaffolding-your-first-vite-project).

## Deploy Your Own

Deploy your own Vite project with Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/examples/tree/main/framework-boilerplates/vite-react&template=vite-react)

_Live Example: https://vite-react-example.vercel.app_

### Deploying From Your Terminal

You can deploy your new Vite project with a single command from your terminal using [Vercel CLI](https://vercel.com/download):

```shell
$ vercel
```

## Token risk checker scripts

This repo includes small utilities to scan an on-chain token contract's runtime bytecode for risky patterns.

- `scripts/checkTokenRisk.ts` — TypeScript implementation (helpers used by tests/tools).
- `scripts/runCheckTokenRisk.cjs` — CommonJS runner (no ESM loader needed).
- `scripts/runCheckTokenRisk.viem.mjs` — ESM runner using `viem` (recommended).

Flags and usage
- `--validate` (`-v`) — optional flag to enable on-chain validation of candidate addresses found in PUSH20 operands. When used, the runner will check each likely address for contract bytecode and balance.

Examples
```powershell
# Run viem ESM runner with on-chain validation (uses MAINNET_RPC_URL env)
$env:MAINNET_RPC_URL='https://eth-mainnet.g.alchemy.com/v2/<KEY>'
node scripts/runCheckTokenRisk.viem.mjs --validate 0x6B175474E89094C44Da98b954EedeAC495271d0F

# Run CommonJS runner (also accepts --validate)
$env:MAINNET_RPC_URL='https://eth-mainnet.g.alchemy.com/v2/<KEY>'
node scripts/runCheckTokenRisk.cjs --validate 0x6B175474E89094C44Da98b954EedeAC495271d0F
```

Notes
- The classification heuristic labels 20-byte words as `likely addresses` vs `data-like` based on printable ASCII ratio. It is conservative and may produce false positives for embedded metadata.
- The `--validate` check requires a working RPC endpoint (set `MAINNET_RPC_URL`) and may increase runtime due to network queries.

