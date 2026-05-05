const DEFAULT_TIMEZONE = 'UTC';

const TIMEZONE_LIST = typeof Intl.supportedValuesOf === 'function'
  ? new Set(Intl.supportedValuesOf('timeZone'))
  : new Set(['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

module.exports = {
  DEFAULT_TIMEZONE,
  TIMEZONE_LIST,
  IMAGE_MIME_TYPES,
  IMAGE_EXTENSIONS,
};
