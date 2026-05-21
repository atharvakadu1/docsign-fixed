# DocSign Platform — Setup & Deployment Guide

## ═══════════════════════════════════════════
## PART 1: MONGODB ATLAS SETUP
## ═══════════════════════════════════════════

1. Go to https://cloud.mongodb.com
2. Create a cluster (free M0 tier is fine)
3. Database Access → Add user → username + password (save these)
4. Network Access → Add IP Address → Allow from Anywhere (0.0.0.0/0)
5. Click Connect → Drivers → copy the connection string

Your connection string looks like:
  mongodb+srv://alice:mypassword@cluster0.abc12.mongodb.net/?retryWrites=true&w=majority

Add your database name:
  mongodb+srv://alice:mypassword@cluster0.abc12.mongodb.net/docsign?retryWrites=true&w=majority


## ═══════════════════════════════════════════
## PART 2: RUN LOCALLY (for testing)
## ═══════════════════════════════════════════

### Backend:
  cd backend
  npm install
  # Edit .env — paste your MongoDB Atlas URI
  npm run dev
  # Should print: ✅ MongoDB Atlas connected: cluster0.abc12...

### Frontend (new terminal):
  cd frontend
  npm install
  npm start
  # Opens http://localhost:3000

### Test flow:
  1. Register two accounts (User A and User B)
  2. Login as User A → My Documents → Upload a PDF
  3. Select User B as signer → Upload
  4. Go to Biometric → Register fingerprint (requires HTTPS or localhost)
  5. Login as User B → Sign Requests → Review & Sign
  6. Complete biometric → Sign Document
  7. Blockchain page → Verify Chain Integrity


## ═══════════════════════════════════════════
## PART 3: DEPLOY BACKEND TO RENDER
## ═══════════════════════════════════════════

1. Push code to GitHub:
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/docsign
   git push -u origin main

2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - Root Directory: backend
   - Build Command: npm install
   - Start Command: node server.js
   - Environment: Node

5. Add environment variables in Render dashboard:
   MONGODB_URI     = your Atlas connection string
   JWT_SECRET      = any long random string (64+ chars)
   JWT_EXPIRES_IN  = 7d
   NODE_ENV        = production
   CLIENT_URL      = https://YOUR-APP.vercel.app  (fill after Vercel deploy)
   WEBAUTHN_RP_ID  = YOUR-API.onrender.com
   WEBAUTHN_RP_NAME = DocSign Platform
   WEBAUTHN_ORIGIN = https://YOUR-APP.vercel.app

6. Deploy → Your API URL: https://docsign-api.onrender.com


## ═══════════════════════════════════════════
## PART 4: DEPLOY FRONTEND TO VERCEL
## ═══════════════════════════════════════════

1. Go to https://vercel.com → New Project → Import from GitHub
2. Set:
   - Root Directory: frontend
   - Framework Preset: Create React App
3. Add environment variable:
   REACT_APP_API_URL = https://docsign-api.onrender.com/api
4. Deploy → Your app URL: https://docsign.vercel.app

5. Go back to Render → update these env vars with your Vercel URL:
   CLIENT_URL      = https://docsign.vercel.app
   WEBAUTHN_ORIGIN = https://docsign.vercel.app
   Then click "Manual Deploy" to restart.


## ═══════════════════════════════════════════
## PART 5: WEBAUTHN ON ANDROID
## ═══════════════════════════════════════════

WebAuthn REQUIRES either:
  - localhost (for dev)
  - HTTPS domain (for production)

On Android with Chrome:
  1. Open https://your-app.vercel.app
  2. Register your account
  3. Go to Biometric Setup → Register Fingerprint
  4. Chrome will prompt for your fingerprint
  5. Confirm → credential stored on device

For signing:
  1. Open pending signature
  2. Tap "Biometric" button
  3. Touch fingerprint sensor when prompted
  4. Click "Sign Document"


## ═══════════════════════════════════════════
## PART 6: DEMO SCRIPT (VIVA)
## ═══════════════════════════════════════════

Step 1: Show login with fraud detection
  → Login from a new device/browser → show security warning

Step 2: Upload a document
  → Upload PDF → show SHA-256 hash computed instantly
  → Show QR code generated
  → Show genesis + upload block in Blockchain page

Step 3: Send signature request
  → Select 2 users with threshold policy (e.g. 2-of-3)
  → Show pending dashboard

Step 4: Register biometric (on Android)
  → Go to Biometric Setup → Register fingerprint
  → Explain WebAuthn flow (challenge → device → verify)

Step 5: Sign the document
  → Click "Biometric" → fingerprint prompt
  → Click "Sign Document"
  → Show hash chain updated (H0 → H1)
  → Show new blockchain block added

Step 6: Verification
  → Open QR code → copy link → open in incognito (no login)
  → Show: hash verified ✓ · blockchain valid ✓ · signers ✓

Step 7: Blockchain explorer
  → Show all blocks with hashes
  → Click "Verify Chain" → all blocks valid ✓
  → Expand a block → show hash computation formula


## ═══════════════════════════════════════════
## SECURITY FEATURES SUMMARY
## ═══════════════════════════════════════════

| Layer          | Technology           | Purpose                          |
|----------------|----------------------|----------------------------------|
| Passwords      | bcrypt (12 rounds)   | Secure password storage          |
| Sessions       | JWT (7-day expiry)   | Stateless authentication         |
| Document hash  | SHA-256              | Detect any file modification     |
| Signature chain| SHA256(prev+email)   | Link all signatures together     |
| Biometric      | WebAuthn FIDO2       | Device-bound identity proof      |
| Blockchain     | Custom SHA-256 chain | Tamper-evident signature log     |
| Fraud          | Risk scoring         | Block suspicious logins          |
| Rate limiting  | express-rate-limit   | Prevent brute force (20/15min)   |
| Transport      | CORS + Helmet        | Secure HTTP headers              |
