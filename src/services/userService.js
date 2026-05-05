const fs = require('fs');
const path = require('path');
const { TIMEZONE_LIST } = require('../lib/constants');

function validateProfile(payload) {
  const errors = [];
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const timezone = typeof payload.timezone === 'string' ? payload.timezone.trim() : '';

  if (!name || name.length > 80) {
    errors.push('Name must be 1-80 characters');
  }
  if (!timezone || !TIMEZONE_LIST.has(timezone)) {
    errors.push('Timezone is invalid');
  }
  return { name, timezone, errors };
}

async function cleanupOldProfilePicture(picturePath, uploadDir) {
  if (picturePath && picturePath.startsWith('/images/')) {
    const oldFileName = path.basename(picturePath);
    const oldPath = path.join(uploadDir, oldFileName);
    await fs.promises.unlink(oldPath).catch(() => {});
  }
}

module.exports = {
  validateProfile,
  cleanupOldProfilePicture,
};
