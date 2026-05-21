// services/webauthnService.js
/**
 * WebAuthn (FIDO2) Biometric Authentication Service
 * Uses @simplewebauthn/server v9
 *
 * Works with:
 *  - Android biometrics (fingerprint, face)
 *  - Windows Hello (fingerprint, face, PIN)
 *  - Touch ID / Face ID (macOS/iOS)
 *
 * Flow:
 *  Registration:
 *    1. GET  /api/auth/webauthn/register/options  → challenge
 *    2. POST /api/auth/webauthn/register/verify   → store credential
 *
 *  Authentication (before signing):
 *    1. GET  /api/auth/webauthn/auth/options      → challenge
 *    2. POST /api/auth/webauthn/auth/verify       → confirm identity
 */

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const { isoBase64URL, isoUint8Array } = require('@simplewebauthn/server/helpers');

const RP_ID   = process.env.WEBAUTHN_RP_ID   || 'localhost';
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'DocSign Platform';
const ORIGIN  = process.env.WEBAUTHN_ORIGIN  || 'http://localhost:3000';

// ── Registration Step 1: Generate options ─────────────────
async function generateRegOptions(user) {
  // Exclude already-registered credentials
  const excludeCredentials = (user.webauthnCredentials || []).map((c) => ({
    id:         isoBase64URL.toBuffer(c.credentialID),
    type:       'public-key',
    transports: c.transports || [],
  }));

  const options = await generateRegistrationOptions({
    rpID:              RP_ID,
    rpName:            RP_NAME,
    userID:            isoUint8Array.fromUTF8String(user._id.toString()),
    userName:          user.email,
    userDisplayName:   user.name,
    attestationType:   'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey:              'preferred',
      userVerification:         'required',
      authenticatorAttachment:  'platform', // uses device biometric, not security key
    },
    timeout: 60000,
  });

  return options; // options.challenge is base64url encoded
}

// ── Registration Step 2: Verify and store credential ──────
async function verifyRegResponse(user, response, expectedChallenge) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin:          ORIGIN,
    expectedRPID:            RP_ID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Biometric registration could not be verified');
  }

  const { registrationInfo } = verification;

  // @simplewebauthn/server v9: fields are at the top level of registrationInfo,
  // NOT nested under registrationInfo.credential
  const {
    credentialID,
    credentialPublicKey,
    counter,
    credentialDeviceType,
    credentialBackedUp,
  } = registrationInfo;

  const newCred = {
    credentialID:        isoBase64URL.fromBuffer(credentialID),
    credentialPublicKey: isoBase64URL.fromBuffer(credentialPublicKey),
    counter:             counter,
    deviceType:          credentialDeviceType,
    backedUp:            credentialBackedUp,
    transports:          response.response?.transports || [],
    deviceName:          detectDeviceName(response),
    registeredAt:        new Date(),
  };

  user.webauthnCredentials.push(newCred);
  user.biometricEnabled = true;
  await user.save();

  return { verified: true, credentialID: newCred.credentialID, deviceName: newCred.deviceName };
}

// ── Auth Step 1: Generate challenge ───────────────────────
async function generateAuthOptions(user) {
  const allowCredentials = (user.webauthnCredentials || []).map((c) => ({
    id:         isoBase64URL.toBuffer(c.credentialID),
    type:       'public-key',
    transports: c.transports || [],
  }));

  if (allowCredentials.length === 0) {
    throw new Error('No biometric credentials registered for this account. Please register first.');
  }

  const options = await generateAuthenticationOptions({
    rpID:             RP_ID,
    userVerification: 'required',
    allowCredentials,
    timeout:          60000,
  });

  return options;
}

// ── Auth Step 2: Verify biometric response ────────────────
async function verifyAuthResponse(user, response, expectedChallenge) {
  // Find the credential being used
  const storedCred = user.webauthnCredentials.find(
    (c) => c.credentialID === response.id
  );
  if (!storedCred) {
    throw new Error('Credential not found. Has this device been registered?');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin:          ORIGIN,
    expectedRPID:            RP_ID,
    requireUserVerification: true,
    credential: {
      id:         isoBase64URL.toBuffer(storedCred.credentialID),
      publicKey:  isoBase64URL.toBuffer(storedCred.credentialPublicKey),
      counter:    storedCred.counter,
      transports: storedCred.transports || [],
    },
  });

  if (!verification.verified) {
    throw new Error('Biometric verification failed — signature did not match');
  }

  // Update counter (prevents replay attacks)
  // @simplewebauthn/server v9: counter is at authenticationInfo.newCounter
  const newCounter = verification.authenticationInfo?.newCounter ?? verification.authenticationInfo?.credentialCounter;
  storedCred.counter = newCounter;
  await user.save();

  return {
    verified:   true,
    deviceName: storedCred.deviceName,
    credentialID: storedCred.credentialID,
  };
}

// ── Detect device name from response ──────────────────────
function detectDeviceName(response) {
  const transports = response.response?.transports || [];
  if (transports.includes('internal')) return 'Platform authenticator (device biometric)';
  if (transports.includes('usb'))      return 'USB Security Key';
  if (transports.includes('nfc'))      return 'NFC Security Key';
  return 'Unknown authenticator';
}

module.exports = {
  generateRegOptions,
  verifyRegResponse,
  generateAuthOptions,
  verifyAuthResponse,
};