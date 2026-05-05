const userService = require('../services/userService');
const userRepository = require('../repositories/userRepository');

function createUserControllers(db, uploadDir, defaultTimezone) {
  return {
    getUser: async (req, res) => {
      try {
        const user = await userRepository.getUserById(db, req.session.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json({
          id: user.id,
          username: user.username,
          name: user.name,
          timezone: user.timezone || defaultTimezone,
          profilePicture: user.profile_picture
        });
      } catch (_error) {
        return res.status(500).json({ error: 'Failed to retrieve user' });
      }
    },

    updateProfile: async (req, res) => {
      const { name, timezone, errors } = userService.validateProfile(req.body || {});
      if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

      try {
        await userRepository.updateUserProfile(db, req.session.userId, { name, timezone });
        return res.json({ success: true });
      } catch (_error) {
        return res.status(500).json({ error: 'Update failed' });
      }
    },

    uploadPicture: async (req, res) => {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const picturePath = `/images/${req.file.filename}`;

      try {
        const user = await userRepository.getUserProfilePicture(db, req.session.userId);
        if (user && user.profile_picture) {
          await userService.cleanupOldProfilePicture(user.profile_picture, uploadDir);
        }

        await userRepository.updateUserProfilePicture(db, req.session.userId, picturePath);
        return res.json({ success: true, profilePicture: picturePath });
      } catch (_error) {
        return res.status(500).json({ error: 'Upload failed' });
      }
    },
  };
}

module.exports = { createUserControllers };
