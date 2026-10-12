/**
 * LIQASTO — Set Admin Role Script
 * Usage: node set-admin.js user@gmail.com
 */

import admin from 'firebase-admin';
import fs from 'fs';

const email = process.argv[2] || 'seanrabwet@gmail.com';

if (!fs.existsSync('./serviceAccountKey.json')) {
  console.log('Notice: serviceAccountKey.json not found in root.');
  console.log('To set admin claim on live Firebase, download your Service Account Key from Firebase Console and save as serviceAccountKey.json.');
  process.exit(0);
}

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function makeAdmin() {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  await admin.firestore().collection('users').doc(user.uid).set({ role: 'admin' }, { merge: true });
  console.log(`✓ Admin role granted to: ${email} (UID: ${user.uid})`);
  process.exit(0);
}

makeAdmin().catch(err => {
  console.error('Error granting admin role:', err);
  process.exit(1);
});
