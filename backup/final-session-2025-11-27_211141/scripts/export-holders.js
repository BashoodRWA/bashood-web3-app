// scripts/export-holders.js (basic exporter — adapt for production)
// Usage: npx hardhat run scripts/export-holders.js --network <network> --token <TOKEN_ADDRESS> --type <ERC20|ERC721|ERC1155> --fromBlock <B> --toBlock <B>
const hre = require('hardhat');
const { ethers } = hre;
const fs = require('fs');

async function main() {
  const argv = process.argv.slice(2);
  const tokenArgIndex = argv.findIndex(a => a === '--token');
  const token = tokenArgIndex >= 0 ? argv[tokenArgIndex + 1] : process.env.TOKEN_ADDRESS;
  const typeIndex = argv.findIndex(a => a === '--type');
  const tokenType = typeIndex >= 0 ? argv[typeIndex + 1] : process.env.TOKEN_TYPE || 'ERC20';
  const fromIndex = argv.findIndex(a => a === '--fromBlock');
  const fromBlock = fromIndex >= 0 ? Number(argv[fromIndex + 1]) : 0;
  const toIndex = argv.findIndex(a => a === '--toBlock');
  const toBlock = toIndex >= 0 ? (argv[toIndex + 1] === 'latest' ? 'latest' : Number(argv[toIndex + 1])) : 'latest';

  if (!token) throw new Error('Provide token address with --token <address>');

  console.log('Token:', token, 'Type:', tokenType, 'fromBlock:', fromBlock, 'toBlock:', toBlock);

  const provider = ethers.provider;
  const ifaceERC20 = new ethers.Interface([ 'event Transfer(address indexed from, address indexed to, uint256 value)' ]);
  const ifaceERC721 = new ethers.Interface([ 'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)' ]);
  const ifaceERC1155 = new ethers.Interface([
    'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
    'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)'
  ]);

  const filter = {};
  let logs = [];
  if (tokenType === 'ERC20') {
    const eventSig = ifaceERC20.getEventTopic('Transfer');
    logs = await provider.getLogs({ address: token, fromBlock, toBlock, topics: [eventSig] });
  } else if (tokenType === 'ERC721') {
    const eventSig = ifaceERC721.getEventTopic('Transfer');
    logs = await provider.getLogs({ address: token, fromBlock, toBlock, topics: [eventSig] });
  } else {
    const sig1 = ifaceERC1155.getEventTopic('TransferSingle');
    const sig2 = ifaceERC1155.getEventTopic('TransferBatch');
    const l1 = await provider.getLogs({ address: token, fromBlock, toBlock, topics: [sig1] });
    const l2 = await provider.getLogs({ address: token, fromBlock, toBlock, topics: [sig2] });
    logs = l1.concat(l2);
  }

  const holders = new Map();

  for (const log of logs) {
    try {
      if (tokenType === 'ERC20') {
        const parsed = ifaceERC20.parseLog(log);
        const from = parsed.args.from.toLowerCase();
        const to = parsed.args.to.toLowerCase();
        const value = parsed.args.value.toString();
        if (from !== '0x0000000000000000000000000000000000000000') {
          holders.set(from, (BigInt(holders.get(from) || '0') - BigInt(value)).toString());
        }
        holders.set(to, (BigInt(holders.get(to) || '0') + BigInt(value)).toString());
      } else if (tokenType === 'ERC721') {
        const parsed = ifaceERC721.parseLog(log);
        const from = parsed.args.from.toLowerCase();
        const to = parsed.args.to.toLowerCase();
        const tokenId = parsed.args.tokenId.toString();
        // track ownership by tokenId
        holders.set(tokenId, to);
      } else {
        // naive handling for ERC1155: track balances per (id,addr)
        // This exporter is a template — adapt for production.
        // skip detailed parsing here
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  const out = [];
  if (tokenType === 'ERC20') {
    for (const [addr, bal] of holders.entries()) {
      out.push({ address: addr, token_type: 'ERC20', token_id: '', balance: bal });
    }
  } else if (tokenType === 'ERC721') {
    for (const [tokenId, owner] of holders.entries()) {
      out.push({ address: owner, token_type: 'ERC721', token_id: tokenId, balance: 1 });
    }
  }

  const file = `snapshots/holders_${token.replace('0x','')}_${tokenType}.json`;
  fs.mkdirSync('snapshots', { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log('Wrote', file, 'entries:', out.length);
}

main().catch(err => { console.error(err); process.exitCode = 1; });
