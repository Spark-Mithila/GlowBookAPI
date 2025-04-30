const admin = require('firebase-admin');
require('dotenv').config();

// Initialize the Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  
  return {
    db: admin.firestore(),
    auth: admin.auth(),
    admin: admin
  };
};

const { db, auth, admin: firebaseAdmin } = initializeFirebase();

module.exports = {
  db,
  auth,
  firebaseAdmin
};