const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

function keccak256Bytes(...items) {
  // encode each item as bytes and concat: address (20), string (utf8), uint256 (as uint256)
  // We'll ABI-encode a tuple for deterministic encoding
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode([
    'address',
    'string',
    'uint256',
    'uint256'
  ], items));
}

function toBuffer(hex) {
  return Buffer.from(hex.replace(/^0x/, ''), 'hex');
}

function hashPair(a, b) {
  // both are Buffers
  return toBuffer(ethers.utils.keccak256(Buffer.concat([a, b])));
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
      // sibling is the same node (duplicate)
      proof.push('0x' + layer[index].toString('hex'));
    }
    index = Math.floor(index / 2);
  }
  return proof;
}

(async function main() {
  const csvPath = path.join(__dirname, '..', 'snapshots', 'holders.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('snapshots/holders.csv not found in repo');
    process.exit(1);
  }
  const csv = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
  const rows = csv.slice(1).map(line => line.trim()).filter(Boolean);
  const entries = rows.map(line => {
    const parts = line.split(',');
    // address,token_type,token_id,balance
    const address = parts[0].trim();
    const token_type = (parts[1] || '').trim();
    const token_id = (parts[2] || '').trim() || '0';
    const balance = (parts[3] || '').trim() || '0';
    return { address, token_type, token_id: token_id === '' ? '0' : token_id, balance };
  });

  const leaves = entries.map(e => {
    const leafHash = keccak256Bytes(e.address, e.token_type, ethers.BigNumber.from(e.token_id).toString(), ethers.BigNumber.from(e.balance).toString());
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

  const out = {
    generatedAt: new Date().toISOString(),
    root: '0x' + root.toString('hex'),
    leaves: leaves.map(l => l.leaf),
    proofs
  };

  const outPath = path.join(__dirname, '..', 'snapshots', 'merkle-demo.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Merkle demo written to snapshots/merkle-demo.json');
  console.log('Root:', out.root);
  console.log('Leaves:', out.leaves.length);
})();
