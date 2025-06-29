document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('scanForm');
  form.addEventListener('submit', (e) => {
    const cardInput = form.querySelector('input[name="cardId"]');
    if (cardInput.value.trim() === '') {
      e.preventDefault();
      alert("Please scan or enter a card ID.");
    }
  });
});
