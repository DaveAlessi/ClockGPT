function validateTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string' || !timezone.trim()) {
    return { valid: false, error: 'Timezone is required' };
  }
  try {
    const zones = Intl.supportedValuesOf('timeZone');
    if (zones.includes(timezone)) {
      return { valid: true };
    }
  } catch {
    // ignore
  }
  return { valid: false, error: 'Invalid timezone' };
}

function validateUsername(username) {
  if (!username) return { valid: false, error: 'Username is required' };
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  if (username.length > 20) {
    return { valid: false, error: 'Username must be at most 20 characters' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, and underscores',
    };
  }
  return { valid: true };
}

function validateRegistrationPassword(password) {
  if (password == null || password === '') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  return { valid: true };
}

function validateFile(file, maxSizeMB = 5) {
  if (!file) return { valid: false, error: 'No file provided' };

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type. Only images are allowed' };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  return { valid: true };
}

function isAuthenticated(session) {
  return session && session.userId !== undefined && session.userId !== null;
}

module.exports = {
  validateUsername,
  validateTimezone,
  validateRegistrationPassword,
  validateFile,
  isAuthenticated,
};
