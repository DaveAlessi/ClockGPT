// Sign In button - redirect to sign-in page

async function HideSignInButtonIfLoggedIn() {
    const response = await fetch('/api/user');

    if (response.status === 200) {
        const userData = await response.json();

        document.getElementById('signInBtn').textContent = 'Go to Profile';
        document.getElementById('signInBtn').onclick = () => {
            window.location.href = '/profile';
        }
        document.getElementById('welcomeMsg').textContent = `Welcome back ${userData.username}!`;
    } else {
        document.getElementById('signInBtn').onclick = () => {
            window.location.href = '/signin';
        }
        document.getElementById('welcomeMsg').style.display = 'none';
    }
}

// Calculate my time button - chat gpt typewriter effect
document.getElementById('calculateTimeBtn').addEventListener('click', () => {
    const messageBox = document.getElementById('messageBox');
    const message = "Hello! I'm ChatGPT. How can I assist you today?";
    
    // Clear previous message and show the box
    messageBox.textContent = '';
    messageBox.classList.add('visible');
    
    // Typewriter effect - one character at a time
    let index = 0;
    const typingSpeed = 50; // ms per character
    
    function typeCharacter() {
        if (index < message.length) {
            messageBox.textContent += message[index];
            index++;
            setTimeout(typeCharacter, typingSpeed);
        }
    }
    
    typeCharacter();
});

HideSignInButtonIfLoggedIn();