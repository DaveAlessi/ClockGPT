/**
 * @jest-environment jsdom
 */

describe('public/js/registration.js', () => {
  function setupDom() {
    document.body.innerHTML = `
      <form id="registerForm">
        <input id="username" />
        <input id="password" type="password" />
        <input id="confirmPassword" type="password" />
        <select id="timezone"><option value="America/New_York">NY</option></select>
      </form>
      <div id="message"></div>
      <button type="button" id="backBtn"></button>
    `;
  }

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
  });

  test('shows error when passwords do not match', () => {
    setupDom();
    require('../../public/js/registration.js');
    document.getElementById('username').value = 'validuser';
    document.getElementById('password').value = 'secret1';
    document.getElementById('confirmPassword').value = 'secret2';
    document.getElementById('timezone').value = 'America/New_York';
    document.getElementById('registerForm').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    expect(document.getElementById('message').textContent).toBe('Passwords do not match');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('shows error when password is too short', () => {
    setupDom();
    require('../../public/js/registration.js');
    document.getElementById('username').value = 'validuser';
    document.getElementById('password').value = 'abcde';
    document.getElementById('confirmPassword').value = 'abcde';
    document.getElementById('timezone').value = 'America/New_York';
    document.getElementById('registerForm').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    expect(document.getElementById('message').textContent).toBe(
      'Password must be at least 6 characters'
    );
  });

  test('shows success message and calls fetch on valid submit', async () => {
    setupDom();
    global.fetch.mockResolvedValue({
      json: async () => ({ success: true }),
    });
    require('../../public/js/registration.js');
    document.getElementById('username').value = 'validuser';
    document.getElementById('password').value = 'secret12';
    document.getElementById('confirmPassword').value = 'secret12';
    document.getElementById('timezone').value = 'America/New_York';
    document.getElementById('registerForm').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await global.flushAsync();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/registration',
      expect.objectContaining({ method: 'POST' })
    );
    expect(document.getElementById('message').textContent).toBe(
      'Account created! Redirecting...'
    );
  });

  test('shows server error message when registration fails', async () => {
    setupDom();
    global.fetch.mockResolvedValue({
      json: async () => ({ success: false, error: 'Username already exists' }),
    });
    require('../../public/js/registration.js');
    document.getElementById('username').value = 'validuser';
    document.getElementById('password').value = 'secret12';
    document.getElementById('confirmPassword').value = 'secret12';
    document.getElementById('timezone').value = 'America/New_York';
    document.getElementById('registerForm').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await global.flushAsync();
    expect(document.getElementById('message').textContent).toBe('Username already exists');
  });
});
