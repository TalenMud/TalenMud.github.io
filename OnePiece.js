function generateQuote() {
    const quotes = [
      "I'm going to be the Pirate King!",
      "I'm not going to die, even if I have to die!",
      "I'm going to find the One Piece!",
      "Only I Can Call My Dream Stupid!",
      "Scars On The Back Are A Swordsman's Shame.",
      "A Man Dies When People Forget Him!",
      'When You Aim High, You Often Come Across Fights That Just Aren\'t Worth Fighting.'
    ];
  
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quote = quotes[randomIndex];
  
    document.getElementById("quote").innerHTML = quote;
}  