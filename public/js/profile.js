// Load user data on page load
async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        
        const user = await response.json();
        
        if (user.name) {
            document.getElementById('name').value = user.name;
        }
        
        if (user.timezone) {
            document.getElementById('timezone').value = user.timezone;
        }
        
        if (user.profilePicture) {
            document.getElementById('profilePicture').src = user.profilePicture;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Handle profile form submission
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const timezone = document.getElementById('timezone').value;
    
    try {
        const response = await fetch('/api/user/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, timezone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Profile updated successfully!', 'success');
        } else {
            showMessage('Failed to update profile.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('An error occurred. Please try again.', 'error');
    }
});

// Handle profile picture upload
document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showMessage('Please select an image file.', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('Image size must be less than 5MB.', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    try {
        const response = await fetch('/api/user/upload-picture', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('profilePicture').src = data.profilePicture;
            showMessage('Profile picture updated successfully!', 'success');
        } else {
            showMessage('Failed to upload profile picture.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('An error occurred while uploading. Please try again.', 'error');
    }
});

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/logout', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Error:', error);
        window.location.href = '/';
    }
});

// Show message helper function
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    
    setTimeout(() => {
        messageEl.className = 'message';
        messageEl.textContent = '';
    }, 3000);
}

// Load user data when page loads
loadUserData();
