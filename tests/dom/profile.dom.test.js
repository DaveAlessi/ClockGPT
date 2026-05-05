/**
 * @jest-environment jsdom
 */

describe('public/js/profile.js', () => {
  function setupDom() {
    document.body.innerHTML = `
      <img id="profilePicture" src="" />
      <form id="profileForm">
        <input id="name" />
        <select id="timezone"><option value="America/New_York">NY</option></select>
      </form>
      <input type="file" id="fileInput" />
      <div id="message"></div>
      <button type="button" id="logoutBtn"></button>
      <button type="button" id="backToHomeBtn"></button>
    `;
  }

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
  });

  test('prefills form from loadUserData', async () => {
    setupDom();
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-csrf-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Sam',
          timezone: 'America/New_York',
          profilePicture: '/images/x.png',
        }),
      });
    require('../../public/js/profile.js');
    await global.flushAsync();
    expect(document.getElementById('name').value).toBe('Sam');
    expect(document.getElementById('timezone').value).toBe('America/New_York');
  });

  test('profile form submit shows success message', async () => {
    setupDom();
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-csrf-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: '', timezone: '' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });
    require('../../public/js/profile.js');
    await global.flushAsync();
    document.getElementById('name').value = 'Lee';
    document.getElementById('timezone').value = 'America/New_York';
    document.getElementById('profileForm').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await global.flushAsync();
    expect(document.getElementById('message').textContent).toBe('Profile updated successfully!');
  });

  test('fileInput rejects non-image files', async () => {
    setupDom();
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-csrf-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
    require('../../public/js/profile.js');
    await global.flushAsync();
    const input = document.getElementById('fileInput');
    const file = new File(['x'], 'x.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await global.flushAsync();
    expect(document.getElementById('message').textContent).toBe('Please select an image file.');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('logout calls POST /logout', async () => {
    setupDom();
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-csrf-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });
    require('../../public/js/profile.js');
    await global.flushAsync();
    document.getElementById('logoutBtn').click();
    await global.flushAsync();
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/logout',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
