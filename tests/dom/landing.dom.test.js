/**
 * @jest-environment jsdom
 */

describe('public/js/landing.js', () => {
  function setupDom() {
    document.body.innerHTML = `
      <form id="signinForm">
        <select id="timezone"><option value="America/New_York">NY</option></select>
        <button type="button" id="calculateTimeBtn"></button>
        <div id="messageBox"></div>
        <div id="welcomeMsg"></div>
        <button type="button" id="signInBtn"></button>
      </form>
    `;
  }

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
  });

  test('when authenticated, welcome message shows username', async () => {
    setupDom();
    global.fetch.mockResolvedValue({
      status: 200,
      json: async () => ({ username: 'pat' }),
    });
    require('../../public/js/landing.js');
    await global.flushAsync();
    expect(document.getElementById('welcomeMsg').textContent).toContain('pat');
    expect(document.getElementById('signInBtn').textContent).toBe('Go to Profile');
  });

  test('when not authenticated, welcome message is hidden', async () => {
    setupDom();
    global.fetch.mockResolvedValue({ status: 401 });
    require('../../public/js/landing.js');
    await global.flushAsync();
    expect(document.getElementById('welcomeMsg').style.display).toBe('none');
  });

  test('calculateTimeBtn runs typewriter effect', async () => {
    setupDom();
    global.fetch.mockResolvedValue({ status: 401 });
    require('../../public/js/landing.js');
    await global.flushAsync();
    jest.useFakeTimers();
    const box = document.getElementById('messageBox');
    document.getElementById('calculateTimeBtn').click();
    expect(box.classList.contains('visible')).toBe(true);
    jest.advanceTimersByTime(500);
    expect(box.textContent.length).toBeGreaterThan(5);
    jest.useRealTimers();
  });
});
