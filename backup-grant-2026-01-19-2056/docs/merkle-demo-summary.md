# Merkle demo summary

Generated: 2025-09-04 UTC

## CSV sample preview
```
address,token_type,token_id,balance
0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa,ERC20,,1000000000000000000
0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb,ERC721,1234,1
```

## First addresses (sample)
```
0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa
0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb
```

## CSV SHA256
`05F7F501A173CA820A033B9506E9F8E60062E2855C263C7E643478B94BE7A132`

## Merkle demo
- File: `snapshots/merkle-demo.json` (demo)
- Root: `0x5bbf05d1966e019687b76f469e103860cb59c7f0c5af93135acdbe148a6df664`
- Leaves count: 2

## Warnings
- The sample CSV contains mixed-case addresses that do not pass checksum validation; the generator substituted the zero address for demo purposes. Use a real CSV with valid checksummed addresses when generating a production snapshot.

## Notes
- The CSV must never be committed to Git; commit only the JSON result and include the CSV SHA256 and chain-of-custody in the commit message.
- To generate a real snapshot in a secure environment:

```powershell
$env:RPC_URL="https://eth-mainnet.g.alchemy.com/v2/<KEY>"
npx hardhat run scripts/generate-merkle-demo.cjs --csv C:\secure\path\holders.csv --out snapshots/merkle-real-mainnet.json --network mainnet
Get-FileHash C:\secure\path\holders.csv -Algorithm SHA256
```

Include the CSV SHA256 and chain-of-custody in the commit message when pushing `snapshots/merkle-real-mainnet.json`.
