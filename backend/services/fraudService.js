// services/fraudService.js
const AuditLog = require('../models/AuditLog');

/**
 * Risk scoring:
 *  0–30  : Low risk → allow
 *  31–59 : Medium → warn user
 *  60+   : High → block login
 */

function getHour() { return new Date().getHours(); }

function isUnusualHour() {
  const h = getHour();
  return h >= 0 && h <= 5; // midnight–5am
}

function isNewIP(user, ip) {
  return ip && !user.knownIPs?.includes(ip);
}

function isNewDevice(user, ua) {
  return ua && !user.knownDevices?.some((d) => d.ua === ua);
}

function ipChanged(user, ip) {
  return user.lastLoginIP && user.lastLoginIP !== ip;
}

async function recentFailedLogins(userId, windowMin = 10) {
  const since = new Date(Date.now() - windowMin * 60000);
  return AuditLog.countDocuments({ userId, action: 'login_failed', createdAt: { $gte: since } });
}

// Main risk analysis
async function analyzeRisk(user, { ip, userAgent }) {
  const flags = [];
  let score = 0;

  if (isUnusualHour()) {
    flags.push(`Unusual login hour (${getHour()}:00)`);
    score += 20;
  }
  if (isNewIP(user, ip)) {
    flags.push(`Login from new IP: ${ip}`);
    score += 25;
  }
  if (ipChanged(user, ip)) {
    flags.push(`IP changed from ${user.lastLoginIP} → ${ip}`);
    score += 15;
  }
  if (isNewDevice(user, userAgent)) {
    flags.push('Login from unrecognized device');
    score += 20;
  }

  const failedCount = await recentFailedLogins(user._id);
  if (failedCount >= 3) {
    flags.push(`${failedCount} failed login attempts in last 10 minutes`);
    score += Math.min(failedCount * 15, 60);
  }

  const level = score >= 60 ? 'high' : score >= 31 ? 'medium' : 'low';
  const action = score >= 60 ? 'block' : score >= 31 ? 'warn' : 'allow';

  return { score, level, action, flags, isSuspicious: score >= 31 };
}

// Register new device/IP after successful login
function updateUserDeviceInfo(user, { ip, userAgent }) {
  if (ip && !user.knownIPs?.includes(ip)) {
    user.knownIPs = [...(user.knownIPs || []), ip].slice(-20);
  }
  if (userAgent && !user.knownDevices?.some((d) => d.ua === userAgent)) {
    user.knownDevices = [
      ...(user.knownDevices || []),
      { ua: userAgent, ip, firstSeen: new Date() },
    ].slice(-10);
  }
  user.lastLoginIP = ip;
  user.lastLoginAt = new Date();
}

module.exports = { analyzeRisk, updateUserDeviceInfo };
