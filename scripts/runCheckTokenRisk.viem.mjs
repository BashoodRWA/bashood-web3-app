import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

function isLikelyEthAddress(hex20) {
  if (!hex20) return false
  if (/^0{40}$/.test(hex20) || /^f{40}$/.test(hex20)) return false
  const buf = Buffer.from(hex20, 'hex')
  let printable = 0
  for (const b of buf) if (b >= 32 && b <= 126) printable++
  const printableRatio = printable / 20
  if (printableRatio > 0.5) return false
  return true
}

async function run() {
  const argv = process.argv.slice(2)
  const validate = argv.includes('--validate') || argv.includes('-v')
  const txcount = argv.includes('--txcount') || argv.includes('-t')
  const tokenArg = argv.find(a => !a.startsWith('--') && !a.startsWith('-'))
  const token = (tokenArg || '0x6B175474E89094C44Da98b954EedeAC495271d0F').toLowerCase()
  const rpc = process.env.MAINNET_RPC_URL
  if (!rpc) {
    console.error('Please set MAINNET_RPC_URL');
    process.exit(1)
  }

  const client = createPublicClient({ chain: mainnet, transport: http(rpc) })

  const bytecodeResp = await client.getBytecode({ address: token })
  const code = bytecodeResp || '0x'
  const risks = []
  if (!code || code === '0x') {
    console.log(JSON.stringify({ risks: ['No runtime bytecode (not a contract)'], score: 100 }))
    return
  }
  const runtimeCode = code.startsWith('0x') ? code.slice(2) : code

  const needle = '636caf9a18'
  if (runtimeCode.toLowerCase().includes(needle)) risks.push('Contains PUSH4 0x6caf9a18 (external transfer handler)')

  const rc = runtimeCode.toLowerCase()
  const push20 = /73([0-9a-f]{40})/gi
  const found = []
  let m
  while ((m = push20.exec(rc)) !== null) found.push(m[1])
  const uniques = Array.from(new Set(found.map(h => h.toLowerCase())))
  const likelyAddrs = []
  const dataWords = []
  for (const h of uniques) {
    if (isLikelyEthAddress(h)) likelyAddrs.push('0x' + h)
    else dataWords.push('0x' + h)
  }
  const tokenNormalized = token.replace(/^0x/, '')
  const filteredLikely = likelyAddrs.filter(a => a !== '0x' + tokenNormalized && a !== '0x' + '0'.repeat(40))
  if (filteredLikely.length > 2) {
    risks.push(`Multiple hard-coded addresses (${filteredLikely.length}): ${filteredLikely.slice(0,5).join(', ')}`)
  } else if (dataWords.length > 0 && filteredLikely.length > 0) {
    risks.push(`Found ${filteredLikely.length} likely addresses and ${dataWords.length} data-like 20-byte words`)
  } else if (dataWords.length > 3) {
    risks.push(`Multiple embedded 20-byte data words (${dataWords.length}) — may indicate embedded metadata`)
  }

  const calls = (runtimeCode.match(/f1/gi) || []).length
  if (calls >= 2) risks.push(`Multiple low-level CALLs in runtime bytecode (${calls})`)

  // Validate likely addresses on-chain via viem (optional)
  const likelyDetails = []
  if (validate && filteredLikely.length > 0) {
    for (const a of filteredLikely) {
      try {
        const codeAt = await client.getBytecode({ address: a })
        const bal = await client.getBalance({ address: a })
        const detail = { address: a, hasCode: !!(codeAt && codeAt !== '0x'), balance: bal?.toString?.() ?? String(bal) }
        if (txcount) {
          try {
            const txc = await client.getTransactionCount({ address: a })
            detail.txCount = typeof txc === 'bigint' ? txc.toString() : String(txc)
            detail.onchainActive = (detail.hasCode || (detail.balance && detail.balance !== '0') || (detail.txCount && detail.txCount !== '0'))
          } catch (e) {
            detail.txCountError = String(e)
          }
        } else {
          detail.onchainActive = (detail.hasCode || (detail.balance && detail.balance !== '0'))
        }
        likelyDetails.push(detail)
      } catch (e) {
        likelyDetails.push({ address: a, error: String(e) })
      }
    }
  }

  const score = Math.min(100, risks.length * 30)
  const examples = [...filteredLikely.slice(0,5), ...dataWords.slice(0,5)].slice(0,5)
  console.log(JSON.stringify({ risks, score, codeLen: runtimeCode.length / 2, examples, likelyDetails }, null, 2))
}

run().catch(e => { console.error(e); process.exit(1) })
