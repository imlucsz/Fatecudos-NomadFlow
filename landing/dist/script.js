(() => {
  const controls = document.querySelectorAll('[data-days]');
  controls.forEach(button => {
    button.addEventListener('click', () => {
      const extraDays = Number(button.dataset.days);
      controls.forEach(control => control.setAttribute('aria-pressed', String(control === button)));
      document.getElementById('ba-range').textContent = `Dias 8–${21 + extraDays}`;
      document.getElementById('ba-duration').textContent = `${14 + extraDays} dias`;
      document.getElementById('mv-range').textContent = `Dias ${22 + extraDays}–${28 + extraDays}`;
      document.getElementById('total-days').textContent = `${28 + extraDays} dias`;
      document.getElementById('change-summary').textContent = extraDays
        ? 'Neste exemplo, Montevidéu começa 7 dias depois. O orçamento precisaria ser revisto.'
        : 'Ponto de partida: três cidades, uma sequência conectada.';
    });
  });
})();
