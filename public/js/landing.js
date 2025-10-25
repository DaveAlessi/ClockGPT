// Sign In button - redirect to sign-in page
document.getElementById('signInBtn').addEventListener('click', () => {
    window.location.href = '/signin';
});

// Calculate my time button - typewriter effect
document.getElementById('calculateTimeBtn').addEventListener('click', () => {
    const messageBox = document.getElementById('messageBox');
    const message = "Hello! I'm ChatGPT. How can I assist you?";
    
    // Clear previous message and show the box
    messageBox.textContent = '';
    messageBox.classList.add('visible');
    
    // Typewriter effect - one character at a time
    let index = 0;
    const typingSpeed = 50; // milliseconds per character
    
    function typeCharacter() {
        if (index < message.length) {
            messageBox.textContent += message[index];
            index++;
            setTimeout(typeCharacter, typingSpeed);
        }
    }
    
    typeCharacter();
});