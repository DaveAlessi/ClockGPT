function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
}

module.exports = {
  regenerateSession,
  destroySession,
};
