// services/hashService.js
const crypto = require('crypto');
const fs = require('fs');

/**
 * hashService
 * All SHA-256 operations for document integrity.
 *
 * Hash Chain:
 *   H0 = SHA256(file bytes)            ← original upload hash
 *   H1 = SHA256(H0 + signer1_email)    ← after first signature
 *   H2 = SHA256(H1 + signer2_email)    ← after second signature
 *   ...
 * This links all signatures cryptographically.
 */

// ── Hash a file via readable stream (supports large PDFs) ──
function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// ── Hash a string ──────────────────────────────────────────
function hashString(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// ── Hash a Buffer ──────────────────────────────────────────
function hashBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ── Extend the hash chain ──────────────────────────────────
// newHash = SHA256(previousHash + signerEmail)
function extendChain(previousHash, signerEmail) {
  return crypto
    .createHash('sha256')
    .update(previousHash + signerEmail)
    .digest('hex');
}

// ── Verify a file's hash matches stored value ──────────────
async function verifyFileIntegrity(filePath, storedHash) {
  try {
    const currentHash = await hashFile(filePath);
    return {
      verified: currentHash === storedHash,
      currentHash,
      storedHash,
      algorithm: 'SHA-256',
      message: currentHash === storedHash
        ? 'Document integrity verified — file has not been modified'
        : 'INTEGRITY FAILURE — document hash does not match stored value',
    };
  } catch (err) {
    return {
      verified: false,
      error: err.message,
      message: 'Could not verify file integrity',
    };
  }
}

// ── Re-compute and verify an entire hash chain ─────────────
function verifyHashChain(chainEntries) {
  if (!chainEntries || chainEntries.length === 0) {
    return { valid: false, message: 'Empty chain' };
  }
  const results = [];
  for (let i = 1; i < chainEntries.length; i++) {
    const prev = chainEntries[i - 1];
    const curr = chainEntries[i];
    const expected = extendChain(prev.hash, curr.signerEmail);
    const valid = expected === curr.hash;
    results.push({
      step: i,
      signer: curr.signerEmail,
      valid,
      expected,
      actual: curr.hash,
    });
  }
  return {
    valid: results.every((r) => r.valid),
    steps: results,
    message: results.every((r) => r.valid)
      ? 'Hash chain is intact — all signatures are verified'
      : 'Hash chain broken — possible tampering detected',
  };
}

// ── Format hash for display ────────────────────────────────
function formatHash(hash, short = false) {
  if (!hash) return 'N/A';
  return short ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : hash;
}

module.exports = { hashFile, hashString, hashBuffer, extendChain, verifyFileIntegrity, verifyHashChain, formatHash };
