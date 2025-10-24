# Quick Start Guide

## Get Up and Running in 3 Steps

### Step 1: Install Dependencies
```bash
cd timezone-app
npm install
```

### Step 2: Start the Server
```bash
npm start
```

### Step 3: Open Your Browser
Navigate to: **http://localhost:3000**

---

## What You'll See

### Landing Page (/)
- Title: "Where are you?"
- Timezone dropdown with options from around the world
- "Sign In" button

### Profile Page (/profile)
- Profile picture (click to upload)
- Name input field
- Timezone selector
- "Update Profile" button
- "Logout" button

---

## Quick Test Flow

1. Select a timezone (e.g., "Pacific Time (PT)")
2. Click "Sign In"
3. Enter your name
4. Optionally upload a profile picture
5. Click "Update Profile"
6. See the success message
7. Click "Logout" to return to landing page

---

## Keyboard Shortcuts

- `Ctrl+C` in terminal - Stop the server
- `npm start` - Start the server
- `npm run dev` - Start with auto-reload (requires installation first)

---

## Troubleshooting One-Liners

**Port 3000 in use?**
Edit `server.js` line 15: `const PORT = 3001;` (or any free port)

**Can't install packages?**
Make sure Node.js is installed: `node --version`

**Server won't start?**
Delete `node_modules` folder and run `npm install` again

---

That's it! You're ready to test. 🚀
