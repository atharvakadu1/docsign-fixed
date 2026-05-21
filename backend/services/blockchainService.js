// services/blockchainService.js
const crypto = require('crypto');
const BlockchainBlock = require('../models/BlockchainBlock');

/**
 * Local Blockchain Service
 *
 * Each block contains:
 *   { index, docHash, signer, timestamp, previousHash } → hashed → currentHash
 *
 * Genesis block (index=0) anchors the chain.
 * Every document upload and every signature adds a new block.
 */

// ── Compute block hash ─────────────────────────────────────
function computeHash(index, docHash, signer, timestamp, previousHash, nonce) {
  const data = `${index}|${docHash}|${signer}|${timestamp}|${previousHash}|${nonce}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ── Initialize blockchain (create genesis if not exists) ───
async function initChain() {
  const exists = await BlockchainBlock.findOne({ index: 0 });
  if (exists) return exists;

  const genesisTimestamp = '2024-01-01T00:00:00.000Z';
  const genesisHash = computeHash(0, '0'.repeat(64), 'GENESIS', genesisTimestamp, '0'.repeat(64), 0);

  const genesis = await BlockchainBlock.create({
    index: 0,
    docId: null,
    docHash: '0'.repeat(64),
    signer: 'GENESIS',
    signerName: 'DocSign System',
    action: 'genesis',
    previousHash: '0'.repeat(64),
    currentHash: genesisHash,
    nonce: 0,
    timestamp: new Date(genesisTimestamp),
    metadata: { note: 'Genesis block — chain initialized' },
  });

  console.log(`⛓️  Blockchain initialized. Genesis hash: ${genesisHash.slice(0, 16)}...`);
  return genesis;
}

// ── Add a new block ────────────────────────────────────────
async function addBlock({ docId, docHash, signer, signerName, signerId, action, metadata = {} }) {
  // Get the latest block to continue the chain
  const lastBlock = await BlockchainBlock.findOne().sort({ index: -1 }).lean();
  if (!lastBlock) throw new Error('Blockchain not initialized. Call initChain() first.');

  const newIndex = lastBlock.index + 1;
  const timestamp = new Date();
  const previousHash = lastBlock.currentHash;

  const currentHash = computeHash(
    newIndex, docHash, signer,
    timestamp.toISOString(), previousHash, 0
  );

  const block = await BlockchainBlock.create({
    index: newIndex,
    docId,
    docHash,
    signer,
    signerName: signerName || signer,
    signerId,
    action,
    previousHash,
    currentHash,
    nonce: 0,
    timestamp,
    metadata,
  });

  return block;
}

// ── Verify the entire chain integrity ──────────────────────
async function verifyChain() {
  const blocks = await BlockchainBlock.find().sort({ index: 1 }).lean();
  if (blocks.length === 0) return { valid: false, message: 'Chain is empty', blocks: [] };

  const results = [];
  let chainValid = true;

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const prevBlock = blocks[i - 1];

    // Recompute hash
    const recomputed = computeHash(
      block.index, block.docHash, block.signer,
      new Date(block.timestamp).toISOString(), block.previousHash, block.nonce
    );

    const hashMatch = block.currentHash === recomputed;
    const linkValid = block.previousHash === prevBlock.currentHash;
    const blockValid = hashMatch && linkValid;

    if (!blockValid) chainValid = false;

    results.push({
      index: block.index,
      action: block.action,
      signer: block.signerName || block.signer,
      valid: blockValid,
      hashMatch,
      linkValid,
      hash: block.currentHash.slice(0, 16) + '...',
    });
  }

  return {
    valid: chainValid,
    totalBlocks: blocks.length,
    message: chainValid
      ? `Chain verified — all ${blocks.length} blocks are intact`
      : 'Chain integrity violation detected',
    results,
  };
}

// ── Get all blocks for a specific document ─────────────────
async function getDocumentBlocks(docId) {
  return BlockchainBlock.find({ docId }).sort({ index: 1 }).lean();
}

// ── Get full chain ─────────────────────────────────────────
async function getFullChain() {
  return BlockchainBlock.find().sort({ index: 1 }).lean();
}

// ── Verify a single document's block history ───────────────
async function verifyDocumentChain(docId) {
  const docBlocks = await getDocumentBlocks(docId);
  if (docBlocks.length === 0) return { valid: false, message: 'No blocks for this document' };

  const results = docBlocks.map((b) => ({
    index: b.index,
    action: b.action,
    signer: b.signerName || b.signer,
    timestamp: b.timestamp,
    docHash: b.docHash,
    currentHash: b.currentHash,
    shortHash: b.currentHash.slice(0, 16) + '...',
    previousHash: b.previousHash,
    shortPrevHash: b.previousHash.slice(0, 16) + '...',
  }));

  return {
    valid: true,
    blockCount: results.length,
    blocks: results,
  };
}

module.exports = { initChain, addBlock, verifyChain, getDocumentBlocks, getFullChain, verifyDocumentChain, computeHash };
