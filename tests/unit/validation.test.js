const {
  validateUsername,
  validateTimezone,
  validateRegistrationPassword,
  validateFile,
  isAuthenticated,
} = require('../../lib/validation');

describe('Validation Unit Tests', () => {
  describe('Username Validation', () => {
    test('should accept valid username', () => {
      const result = validateUsername('validUser123');
      expect(result.valid).toBe(true);
    });

    test('should reject username shorter than 3 characters', () => {
      const result = validateUsername('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Username must be at least 3 characters');
    });

    test('should reject username longer than 20 characters', () => {
      const result = validateUsername('a'.repeat(21));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Username must be at most 20 characters');
    });

    test('should reject username with special characters', () => {
      const result = validateUsername('user@name');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        'Username can only contain letters, numbers, and underscores'
      );
    });

    test('should accept username with underscores', () => {
      const result = validateUsername('user_name_123');
      expect(result.valid).toBe(true);
    });

    test('should reject empty username', () => {
      const result = validateUsername('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Username is required');
    });
  });

  describe('Timezone Validation', () => {
    test('should accept valid timezone', () => {
      const result = validateTimezone('America/New_York');
      expect(result.valid).toBe(true);
    });

    test('should reject invalid timezone', () => {
      const result = validateTimezone('Invalid/Timezone');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid timezone');
    });

    test('should reject empty timezone', () => {
      const result = validateTimezone('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Timezone is required');
    });
  });

  describe('Registration password validation', () => {
    test('should accept password with at least 6 characters', () => {
      expect(validateRegistrationPassword('123456').valid).toBe(true);
    });

    test('should reject short password', () => {
      const r = validateRegistrationPassword('abcde');
      expect(r.valid).toBe(false);
      expect(r.error).toBe('Password must be at least 6 characters');
    });

    test('should reject missing password', () => {
      expect(validateRegistrationPassword('').valid).toBe(false);
      expect(validateRegistrationPassword(null).valid).toBe(false);
    });
  });

  describe('File Upload Validation', () => {
    test('should accept valid image file', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024,
      };
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    test('should reject file larger than max size', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024,
      };
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size must be less than 5MB');
    });

    test('should reject non-image file', () => {
      const file = {
        mimetype: 'application/pdf',
        size: 1 * 1024 * 1024,
      };
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file type. Only images are allowed');
    });

    test('should reject when no file provided', () => {
      const result = validateFile(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    test('should accept PNG file', () => {
      const file = {
        mimetype: 'image/png',
        size: 3 * 1024 * 1024,
      };
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    test('should accept GIF file', () => {
      const file = {
        mimetype: 'image/gif',
        size: 1 * 1024 * 1024,
      };
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('Session Validation', () => {
    test('should return true for valid session', () => {
      const session = { userId: 1 };
      expect(isAuthenticated(session)).toBe(true);
    });

    test('should return false for session without userId', () => {
      const session = { otherData: 'value' };
      expect(isAuthenticated(session)).toBe(false);
    });

    test('should return false for session with null userId', () => {
      const session = { userId: null };
      expect(isAuthenticated(session)).toBe(false);
    });
  });
});
