# 🚀 LocalLoop

> **expose localhost to the world.**  
> A developer-centric reverse proxy tunnel with built-in Chaos Engineering, Request Interception, and Traffic Replay.

![TypeScript](https://img.shields.io/badge/Made%20With-TypeScript-3178C6.svg)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-black.svg)

**LocalLoop** allows you to tunnel your local web server to a public URL securely. Unlike other tunneling tools, LocalLoop gives you a **Mission Control Dashboard** to debug, modify, and replay traffic in real-time.

---

## ✨ Features

* 🌍 **Instant Public URLs**: Expose `localhost:3000` to the internet in seconds.
* 🕵️ **Man-in-the-Middle Interception**: Pause requests, edit Headers/Body, and resume them manually.
* 💥 **Chaos Engineering**: Simulate **High Latency** (Slow 3G) or **Random Failures** (500 Errors) to test app resilience.
* 📜 **Request Replay**: One-click replay of failed webhooks or API calls.
* 🔒 **Secure by Design**: Built-in Token Authentication and Subdomain Ownership.
* ⚡ **Zero Config DNS**: Uses path-based routing (`/hook/subdomain`)—no wildcard DNS required.

---

## 🏗️ Architecture

LocalLoop consists of three components:

1. **CLI Agent** (`/cli`): Runs on your machine, forwards traffic to localhost.
2. **Public Server** (`/server`): Handles incoming traffic, routing, and WebSocket bridging.
3. **Dashboard** (`/dashboard`): A React-based UI to visualize and control traffic.

---

## 🚀 Getting Started

### Installation

Install the CLI tool globally via npm:

```bash
npm install @ayankhandelwal07/local-loop
```

---

### Start Tunnelling

Run your local server (e.g., on port 3000), then run:

```bash
npx super-loop -p 3000 -s my-app -k <YOUR_API_KEY>
```

| Flag | Description | Default |
|------|------------|---------|
| `-p, --port` | The local port to forward | 3000 |
| `-s, --subdomain` | Your unique project name | Required |
| `-k, --key` | Your Authentication Key | Required |

---

### Access the Dashboard

Once connected, the CLI will output your Dashboard URL.  
Open it to see requests flowing in real-time!

---

# ⚠️ Integration Guide (Read Carefully)

Since LocalLoop uses **Path-Based Routing**  
(e.g., `https://localloop.com/hook/my-app/`), modern frontend frameworks need a small tweak to work correctly.

---

## ⚛️ For React / Vite / Vue Users

If you see a **Blank Screen** or **404 Errors for assets (CSS/JS)**, follow these steps:

### 1. Enable Relative Paths

In `vite.config.ts`, add:

```ts
export default defineConfig({
  base: './',
  plugins: [react()],
})
```

If using create-react-app, add this in `package.json`:

```json
{
  "homepage": "."
}
```

---

### 2. Use Production Build

Do not use:

```bash
npm run dev
```

Instead use:

```bash
npm run build
npm run preview
```

---

### 3️⃣ API Requests

❗ **Do NOT use absolute paths (starting with `/`) in your API calls.**

Because LocalLoop uses **path-based routing**, absolute paths will bypass your tunnel and hit the main LocalLoop server instead.

#### 🔎 Why?

- **Absolute Path (`/api/users`)**  
  → `https://localloop.com/api/users`  
  → Hits the LocalLoop main server  
  → ❌ 404 Not Found  

- **Relative Path (`api/users`)**  
  → `https://localloop.com/hook/my-app/api/users`  
  → Hits your active tunnel  
  → ✅ Success  

---

### ✅ Correct Usage

```js
// ❌ BAD: Hits the main server (bypasses your tunnel)
fetch("/api/users");
fetch("https://localloop.com/api/users");

// ✅ GOOD: Routes correctly through your tunnel
fetch("api/users");
axios.get("api/users");
```

💡 **Rule of Thumb:**  
Always use **relative paths** for frontend API calls when using LocalLoop.


---

# 🛠️ Development

## Prerequisites

- Node.js v18+
- Redis
- MongoDB

---

## Setup

### Clone the Repo

```bash
git clone https://github.com/your-username/localloop.git
cd localloop
```

---

### Server Setup

```bash
cd server
npm install

# Create .env file with:
# PORT=3000
# MONGO_URI=...
# REDIS_HOST=...

npm run dev
```

---

### Dashboard Setup

```bash
cd dashboard
npm install
npm run dev
```

---

### CLI Setup

```bash
cd cli
npm install
npm run build
npm link
```

---

