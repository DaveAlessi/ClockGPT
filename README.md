# Timezone Test Application

The next era of AI powered time keeping (just kidding). This is a basic website meant for security testing, namely approaches to finding and resolving security vulnerabilities. This project has intentional security vulnerabilities included, use at your own risk. 

## Features

- **Landing Page**: Select your timezone and sign in
- **Profile Page**: 
  - Update your name
  - Change your timezone
  - Upload a profile picture
- Session-based authentication

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Installation

1. Navigate to the project directory:
```bash
cd timezone-app
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Standard mode:
```bash
npm start
```

### Development mode (with auto-restart on file changes):
```bash
npm run dev
```

The application will start on **http://localhost:3000**

## Using the Application

1. Open your browser and go to `http://localhost:3000`
2. On the landing page, select your timezone from the dropdown
3. Click "Sign In"
4. You'll be redirected to the profile page where you can:
   - Enter your name
   - Change your timezone
   - Upload a profile picture (click on the profile picture area)
5. Click "Update Profile" to save your changes
6. Click "Logout" to return to the landing page


## Technical Details

- **Backend**: Node.js with Express
- **Session Management**: express-session
- **File Upload**: Multer
- **Data Storage**: In-memory (not persistent)
- **Port**: 3000 (configurable in server.js)

## Important Notes

- Profile pictures are saved to `public/images/` directory
- Maximum upload size: 5MB per image

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Troubleshooting

### Port already in use
If port 3000 is already in use, you can change it in `server.js`:
```javascript
const PORT = 3000; // Change this to another port number
```

### Dependencies not installing
Make sure you have Node.js and npm installed:
```bash
node --version
npm --version
```

### Session not working
Make sure cookies are enabled in your browser.


