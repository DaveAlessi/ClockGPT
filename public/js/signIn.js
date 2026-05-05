async function fetchCsrfToken() {
    const response = await fetch('/api/csrf-token');
    if (!response.ok) {
        throw new Error('Unable to fetch CSRF token');
    }
    const data = await response.json();
    return data.csrfToken;
}

document.getElementById('signinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const csrfToken = await fetchCsrfToken();
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/profile';
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('An error occurred. Please try again.', 'error');
    }
});

document.getElementById('registerBtn').addEventListener('click', () => {
    window.location.href = '/registration';
});

document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/';
});

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}