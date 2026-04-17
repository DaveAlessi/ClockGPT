/**
 * @jest-environment jsdom
 */

describe('public/js/signIn.js', () => {
  function setupDom() {
    document.body.innerHTML = `
      <form id="signinForm">
        <input id="username" />
        <input id="password" type="password" />
      </form>
      <div id="message"></div>
      <button type="button" id="registerBtn"></button>
      <button type="button" id="backBtn"></button>
    `;
  }

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
  });

  test('shows error message when login returns error', async () => {
    setupDom();
    global.fetch.mockResolvedValue({
      json: async () => ({ success: false, error: 'Invalid username or password' }),
    });
    require('../../public/js/signIn.js');
    document.getElementById('username').value = 'u';
    document.getElementById('password').value = 'p';
    document.getElementById('signinForm').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await global.flushAsync();
    expect(document.getElementById('message').textContent).toBe('Invalid username or password');
  });

  test('calls fetch with login payload', async () => {
    setupDom();
    global.fetch.mockResolvedValue({
      json: async () => ({ success: false, error: 'bad' }),
    });
    require('../../public/js/signIn.js');
    document.getElementById('username').value = 'alice';
    document.getElementById('password').value = 'secret99';
    document.getElementById('signinForm').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await global.flushAsync();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'alice', password: 'secret99' }),
      })
    );
  });
});
