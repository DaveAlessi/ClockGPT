const path = require('path');

function createViewControllers(viewsPath) {
  return {
    renderLanding: (_req, res) => {
      res.sendFile(path.join(viewsPath, 'landing.html'));
    },

    renderSignIn: (_req, res) => {
      res.sendFile(path.join(viewsPath, 'signin.html'));
    },

    renderRegistration: (_req, res) => {
      res.sendFile(path.join(viewsPath, 'registration.html'));
    },

    renderProfile: (req, res) => {
      if (!req.session.userId) return res.redirect('/signin');
      return res.sendFile(path.join(viewsPath, 'profile.html'));
    },
  };
}

module.exports = { createViewControllers };
