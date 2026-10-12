# 🛒 LIQASTO — Kenya's Premier Liquor, Smokes & Accessories Platform

Liqasto is a full-featured e-commerce web application specifically tailored for alcohol (wines, spirits, beers), cigarettes/tobacco, and smoking/drinkware accessories in Kenya. It is built strictly with vanilla JavaScript (ES modules via CDN), HTML5, and CSS3, backed by Firebase (Authentication, Cloud Firestore, Firebase Storage, and Cloud Functions for Daraja M-Pesa STK Push).

---

## 🌟 Key Highlights

- **Aesthetics & UX:** Jumia-inspired storefront with a rich emerald green and black theme (`linear-gradient(135deg, #000000 0%, #022c22 40%, #047857 75%, #10b981 100%)`).
- **Zero Build Step:** Uses pure native ES modules and Firebase Modular SDK v10 loaded via CDN. No Webpack, Vite, React, or Babel required.
- **Kenyan Shilling (KES):** Standardized currency formatting (`KSh 1,250`) and local delivery zone calculation.
- **18+ Compliance:**
  - Full-screen Age Gate modal on initial visit, persisting age agreement in `localStorage`.
  - Date-of-Birth verification during registration ensuring users are 18+.
  - Strict Gmail requirement (`@gmail.com`) for sign-up.
- **Payments:**
  - Safaricom Daraja API integration for instant **Lipa na M-Pesa STK Push** prompts.
  - Cash / M-Pesa on delivery and card payment options.
- **Delivery Zones:** Nairobi (Westlands, Kilimani, Karen, CBD, Ruaka), Kiambu, Mombasa, and Kisumu with zone-specific fees.
- **Admin Operations Dashboard:** Full CRUD for products, categories, delivery zones, and real-time order status tracking (`admin.html`).
- **Interactive Demo Mode:** Built-in rich offline catalog with fallback data, ensuring the app runs immediately with zero crashes even before live Firebase keys are supplied.

---

## 🚀 Quick Start (Local Development)

### 1. Launch the Server
You can start the local development server in any terminal:
```bash
npm start
```
Or:
```bash
node server.js
```

The application will be live at:
- 🛒 **Storefront:** [http://localhost:3000](http://localhost:3000)
- ⚙️ **Admin Panel:** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

### 2. Debugging in VS Code
Press **F5** in VS Code. The configured `.vscode/launch.json` will automatically launch the dev server without any errors in the Debug Console.

---

## 🛠️ Connecting to Live Firebase

### Step 1: Create a Firebase Project
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project called **Liqasto**.
3. Under **Project Settings > General > Your Apps**, create a Web App (`</>`).
4. Copy your Firebase configuration credentials.

### Step 2: Update Client Credentials
Open `public/js/firebase-config.js` and replace the placeholder fields:
```javascript
export const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "liqasto-xxx.firebaseapp.com",
  projectId: "liqasto-xxx",
  storageBucket: "liqasto-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### Step 3: Enable Firebase Services
1. **Authentication:** Go to *Build > Authentication > Sign-in method* and enable **Email/Password**.
2. **Cloud Firestore:** Go to *Build > Firestore Database* and click **Create Database** (Start in production mode, select region `europe-west1` or `us-central1`).
3. **Storage:** Go to *Build > Storage* and click **Get Started**.
4. **Upgrade to Blaze:** To allow Cloud Functions to communicate with the external Safaricom Daraja API, switch your project to the pay-as-you-go Blaze plan (which provides generous free monthly tiers).

### Step 4: Deploy Rules & Indexes
Install the Firebase CLI if you haven't already:
```bash
npm install -g firebase-tools
firebase login
firebase use --add <your-project-id>
```
Deploy the security rules and composite indexes:
```bash
firebase deploy --only firestore:rules,storage,firestore:indexes
```

### Step 5: Seed the Initial Catalog
Download your Service Account Key:
1. Go to **Firebase Console > Project Settings > Service accounts**.
2. Click **Generate new private key** and save it as `serviceAccountKey.json` in the root of the project.
3. Run the seed script:
```bash
npm run seed
```

### Step 6: Assign Admin Role
Grant admin privileges to your administrator email:
```bash
node set-admin.js your-admin-email@gmail.com
```

---

## 📱 Safaricom Daraja M-Pesa Setup

1. Register on the [Safaricom Daraja Developer Portal](https://developer.safaricom.co.ke/).
2. Create an App to get your **Consumer Key** and **Consumer Secret**.
3. In `functions/.env.example`, fill in your credentials or set them in Firebase:
```bash
firebase functions:config:set mpesa.consumer_key="YOUR_KEY" mpesa.consumer_secret="YOUR_SECRET" mpesa.shortcode="174379" mpesa.passkey="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919" mpesa.callback_url="https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/mpesaCallback"
```
4. Deploy Cloud Functions:
```bash
firebase deploy --only functions
```

---

## 🚢 Deploying to Firebase Hosting

To host the storefront on Firebase's global CDN:
```bash
firebase deploy --only hosting
```
Your app will be accessible at `https://<your-project-id>.web.app`.
