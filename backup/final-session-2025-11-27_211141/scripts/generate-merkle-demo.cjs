const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// Use Hardhat runtime's ethers to ensure same version as tests
// This script is intended to be run with `npx hardhat run scripts/generate-merkle-demo.cjs --network <network>`
// It intentionally contains NO SECRETS and is marked DEMO/REPRODUCIBLE: do not commit raw CSVs into git.
const hre = require('hardhat');
const ethers = hre.ethers;

function keccak256Bytes(address, token_type, token_id, balance) {
  // Use Hardhat ethers helpers to create a packed solidity keccak
  return ethers.solidityPackedKeccak256(['address', 'string', 'uint256', 'uint256'], [address, token_type, token_id, balance]);
}

function toBuffer(hex) {
  return Buffer.from(hex.replace(/^0x/, ''), 'hex');
}

function hashPair(a, b) {
  // a and b are Buffers
  const concat = Buffer.concat([a, b]);
  return toBuffer(ethers.keccak256(concat));
}

function buildTree(leafBuffers) {
  if (leafBuffers.length === 0) return { root: Buffer.alloc(0), layers: [] };
  const layers = [leafBuffers];
  while (layers[layers.length - 1].length > 1) {
    const layer = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(hashPair(left, right));
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers };
}

function getProof(layers, index) {
  const proof = [];
  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const pairIndex = index ^ 1; // sibling
    if (pairIndex < layer.length) {
      proof.push('0x' + layer[pairIndex].toString('hex'));
    } else {
      proof.push('0x' + layer[index].toString('hex'));
    }
    index = Math.floor(index / 2);
  }
  return proof;
}

(function main() {
  // CLI args: --csv <path> --out <path>
  const argv = process.argv.slice(2);
  const csvArgIndex = argv.findIndex(a => a === '--csv');
  const outArgIndex = argv.findIndex(a => a === '--out');
  const csvPath = csvArgIndex >= 0 ? path.resolve(argv[csvArgIndex + 1]) : path.join(__dirname, '..', 'snapshots', 'holders.csv');
  const outPath = outArgIndex >= 0 ? path.resolve(argv[outArgIndex + 1]) : path.join(__dirname, '..', 'snapshots', 'merkle-demo.json');
  if (!fs.existsSync(csvPath)) {
    console.error('snapshots/holders.csv not found in repo');
    process.exit(1);
  }
  const csvRaw = fs.readFileSync(csvPath, 'utf8');
  const csv = csvRaw.trim().split(/\r?\n/);
  const rows = csv.slice(1).map(line => line.trim()).filter(Boolean);
  const entries = rows.map(line => {
    const parts = line.split(',');
    const address = parts[0].trim();
    const token_type = (parts[1] || '').trim();
    const token_id = (parts[2] || '').trim() || '0';
    const balance = (parts[3] || '').trim() || '0';
    return { address, token_type, token_id: token_id === '' ? '0' : token_id, balance };
  });

  const leaves = entries.map(e => {
    // Normalize address: try checksum, otherwise fallback to ZeroAddress (demo only)
    let addr = e.address;
    try {
      addr = ethers.getAddress(addr);
    } catch (err) {
      console.warn('Warning: invalid address in CSV, using zero address for demo:', addr);
      addr = ethers.ZeroAddress;
    }
    // CSV values are strings for token_id and balance; pass them directly for ABI encoding as uint256
    const leafHash = keccak256Bytes(addr, e.token_type, e.token_id.toString(), e.balance.toString());
    return {
      entry: e,
      leaf: leafHash
    };
  });

  const leafBuffers = leaves.map(l => toBuffer(l.leaf));
  const { root, layers } = buildTree(leafBuffers);
  const proofs = {};
  for (let i = 0; i < leafBuffers.length; i++) {
    proofs[i] = {
      index: i,
      entry: leaves[i].entry,
      leaf: '0x' + leafBuffers[i].toString('hex'),
      proof: getProof(layers, i)
    };
  }

  // Compute CSV SHA256 for chain-of-custody
  const csvSha256 = crypto.createHash('sha256').update(csvRaw, 'utf8').digest('hex');

  const out = {
    generatedAt: new Date().toISOString(),
    generatedBy: process.env.USER || process.env.GIT_AUTHOR_NAME || 'local-user',
    chainOfCustody: {
      csvPath: csvPath,
      csvSha256: csvSha256
    },
    root: '0x' + root.toString('hex'),
    leavesCount: leaves.length,
    leaves: leaves.map(l => l.leaf),
    proofs
  };

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Merkle demo written to', outPath);
  console.log('Root:', out.root);
  console.log('Leaves:', out.leaves.length);
})();
