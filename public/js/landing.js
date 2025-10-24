document.getElementById('signinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const timezone = document.getElementById('timezone').value;
    
    if (!timezone) {
        alert('Please select a timezone');
        return;
    }
    
    try {
        const response = await fetch('/signin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ timezone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/profile';
        } else {
            alert('Sign in failed. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
});
