# 🍔 Chill Night Food Point — Order Management & Live Tracking System

A complete fast-food order management system consisting of:
1. **Owner Android POS Application (`android/`)** — Built with Kotlin, Jetpack Compose, Material 3, Coroutines, and Retrofit.
2. **Public Customer Tracking Web Page (`web-tracker/`)** — Built with React, Vite, and Server-Sent Events (SSE) for live real-time synchronization.
3. **Authoritative Backend & Real-Time Engine (`backend/`)** — Built with Node.js, Express, SQLite (`node:sqlite`), and JWT authentication.

---

## 🏗️ Project Structure

```
Cill Night/
├── android/               # Native Android Owner POS App (Kotlin + Jetpack Compose)
│   ├── app/
│   │   ├── build.gradle.kts
│   │   └── src/main/java/com/chillnight/pos/
│   │       ├── MainActivity.kt
│   │       ├── model/Models.kt
│   │       ├── network/ (ApiClient.kt, ApiService.kt)
│   │       ├── viewmodel/AppViewModel.kt
│   │       └── ui/screens/ (Login, Dashboard, Menu, CreateOrder, OrderHistory, OrderDetail)
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── gradlew.bat
├── web-tracker/           # Public Customer Order-Tracking Web Application (React + Vite)
│   ├── src/
│   │   ├── App.jsx        # Synchronized countdown timer, live status stepper, bill details
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
└── backend/               # Shared Authoritative API & Real-Time Server
    ├── src/
    │   ├── server.js      # Express entrypoint + static web serving
    │   ├── db.js          # SQLite schema, indexes, and initial menu seeds
    │   ├── auth.js        # Owner JWT authentication & bcrypt verification
    │   ├── events.js      # Server-Sent Events (SSE) live order broadcaster
    │   └── routes/        # menu.js, orders.js, dashboard.js, tracking.js
    └── test/
        └── backend.test.js # Automated test suite
```

---

## 🚀 1. Backend Setup & Execution

### Prerequisites
- Node.js `v22.5+` or `v24+` (uses built-in `node:sqlite`)

### Start the Server
```bash
cd backend
npm install
npm start
```
The server starts on `http://0.0.0.0:4000`.

### Default Owner Credentials
- **Username**: `admin`
- **Password**: `chillnight123`
*(Can be customized via environment variables in `.env`)*

### Run Automated Tests
```bash
cd backend
npm test
```

---

## 🌐 2. Public Customer Tracking Web Page Deployment

### Local Development
```bash
cd web-tracker
npm install
npm run dev
```
Runs at `http://localhost:5173/track?token=<tracking_token>`.

### Production Build
```bash
cd web-tracker
npm run build
```
This outputs a production bundle in `web-tracker/dist/`.

### Deployment Options
1. **Unified Deployment (Zero Extra Config)**:
   - The `backend/src/server.js` automatically detects `web-tracker/dist` and serves the customer tracking application directly from the same server (`http://<your-domain-or-ip>:4000/track?token=...`).
2. **Cloud Hosting (Cloudflare Pages / Vercel / Firebase Hosting / Render)**:
   - Deploy `backend/` to **Render**, **Railway**, or **Fly.io** (set `JWT_SECRET` and `TRACKING_BASE_URL` environment variables).
   - Deploy `web-tracker/dist` to **Firebase Hosting**, **Vercel**, or **Cloudflare Pages** and point `/api/*` rewrites to your backend URL.

---

## 📱 3. Android Owner App (APK Build & Usage)

### Building the APK
From the `android/` directory:
```bash
gradlew.bat assembleDebug
```
The compiled installable APK is generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Connecting the Android App to the Server
1. Open the **Chill Night POS** app on your Android phone or emulator.
2. On the Sign-In screen, tap **"Configure Server URL"**:
   - **Android Emulator**: `http://10.0.2.2:4000/` (Default)
   - **Physical Android Phone on same Wi-Fi**: `http://<your-computer-lan-ip>:4000/` (e.g., `http://192.168.1.10:4000/`)
   - **Production Cloud Server**: `https://your-production-domain.com/`
3. Sign in with `admin` / `chillnight123`.

---

## 🔒 4. Key Architectural & Security Features

- **Historical Price Snapshots**: When an order is placed, item names and unit prices are snapshotted into `order_items`. Future menu price edits never alter historical orders.
- **Authoritative Server Recalculation**: All subtotals, delivery fees, total bills, and remaining payment balances are recalculated on the backend.
- **Synchronized Target Deadlines**: Estimated ready and delivery deadlines are stored as UTC ISO timestamps (`estimated_ready_at`, `estimated_delivery_at`). The customer's tracking timer computes remaining time dynamically against the deadline (`deadline - now`), remaining 100% accurate across page refreshes or browser restarts.
- **Unguessable Tracking Links & PII Protection**: Each order receives a 128-bit cryptographic token (`trk_...`). The public endpoint `/api/track/:token` is strictly read-only, masks customer phone numbers (`+92 3 ••••• 43`), and never exposes internal database IDs or other customers' orders.
- **Manual WhatsApp Sharing**: Tapping **"Share Live Tracking on WhatsApp"** opens WhatsApp with the customer's phone number and a pre-filled message containing their order number, total bill, and unique tracking URL so the owner can review and tap send manually.
