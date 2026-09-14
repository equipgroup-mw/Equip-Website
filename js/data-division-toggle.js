export function initDataDivisionToggle() {
  const tabs = document.querySelectorAll('.dd-view-btn');
  const panels = document.querySelectorAll('[data-panel]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
      panels.forEach(p => p.hidden = true);
      tab.setAttribute('aria-selected', 'true');
      const panelId = `dd${tab.dataset.view.charAt(0).toUpperCase() + tab.dataset.view.slice(1)}Panel`;
      const panel = document.getElementById(panelId);
      if (panel) panel.hidden = false;
      localStorage.setItem('ddView', tab.dataset.view);
    });
  });

  const saved = localStorage.getItem('ddView');
  if (saved) {
    const tab = document.querySelector(`.dd-view-btn[data-view="${saved}"]`);
    if (tab) tab.click();
  }
}