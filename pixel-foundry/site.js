/* Native vertical scroll drives the wide-screen industry sequence.
   Every other mode retains the complete, ordinary document. */
(() => {
  const sectors = document.querySelector('.sectors');
  const stage = document.querySelector('.sector-stage');
  const toolbar = document.querySelector('.sector-toolbar');
  const track = document.querySelector('.sector-track');
  const viewport = document.querySelector('.sector-viewport');
  const panels = [...document.querySelectorAll('.sector-panel')];
  const links = [...document.querySelectorAll('.sector-nav a')];
  const modeButton = document.querySelector('.vertical-mode');
  const previous = document.querySelector('[data-sector-prev]');
  const next = document.querySelector('[data-sector-next]');
  const count = document.querySelector('.sector-count');
  const bridge = document.querySelector('.world-window');
  const bridgeImage = document.querySelector('.window-image');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, max = 1) => Math.max(0, Math.min(max, value));
  const topOf = element => element.getBoundingClientRect().top + scrollY;
  const jump = top => window.scrollTo({top, behavior:'instant'});
  let horizontal = false;
  let forceVertical = false;
  let active = 0;
  let frame = 0;
  let geometry = {};
  let revealObserver;

  function select(index) {
    const changed = index !== active;
    if (horizontal && changed && panels[active].contains(document.activeElement)) {
      stage.focus({preventScroll:true});
    }
    active = index;
    panels.forEach((panel, i) => { panel.inert = horizontal && i !== active; });
    links.forEach((link, i) => {
      if (i === active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    const label = `${String(active + 1).padStart(2, '0')} / ${String(panels.length).padStart(2, '0')}`;
    if (count.textContent !== label) count.textContent = label;
    previous.disabled = active === 0;
    next.disabled = active === panels.length - 1;
  }

  function measure() {
    sectors.style.setProperty('--sector-toolbar-height', `${toolbar.offsetHeight}px`);
    geometry = {
      top:topOf(sectors),
      segment:innerHeight * 1.1,
      width:viewport.clientWidth,
      bridgeFrom:topOf(bridge) - innerHeight * .7,
      bridgeLength:innerHeight * .9
    };
    if (horizontal) {
      sectors.style.setProperty('--sector-height', `${innerHeight + geometry.segment * (panels.length - 1 + .35)}px`);
    }
    render();
  }

  function configure(anchor = null, preservePosition = false) {
    const expanded = panels.some(panel => panel.querySelector('details').open);
    const desired = innerWidth >= 1180 && innerHeight >= 780 && !reduced.matches && !forceVertical && !expanded;
    if (desired === horizontal) {
      const progress = (scrollY - geometry.top) / geometry.segment;
      const restore = horizontal && preservePosition && progress >= 0 && progress <= panels.length - 1 + .35;
      measure();
      if (restore) { jump(geometry.top + progress * geometry.segment); render(); }
      return;
    }
    const bounds = sectors.getBoundingClientRect();
    // Keep the reader's place if accessibility preferences or viewport dimensions change.
    let reference = anchor;
    if (!reference && bounds.top <= 0 && bounds.bottom > 0) reference = panels[active].querySelector('h2');
    if (!reference && bounds.bottom <= 0) reference = document.querySelector('#practice');
    const oldOffset = reference?.getBoundingClientRect().top;
    horizontal = desired;
    sectors.classList.toggle('is-horizontal', horizontal);
    if (!horizontal) {
      sectors.style.removeProperty('--sector-height');
      track.style.removeProperty('transform');
      panels.forEach(panel => {
        panel.inert = false;
        panel.style.removeProperty('--overview-shift');
        panel.style.removeProperty('--scene-drift');
      });
    }
    modeButton.firstChild.textContent = horizontal ? 'Read vertically ' : 'Explore horizontally ';
    measure();
    if (reference) {
      if (horizontal && panels.some(panel => panel.contains(reference))) {
        const index = panels.findIndex(panel => panel.contains(reference));
        jump(geometry.top + index * geometry.segment);
      } else {
        jump(topOf(reference) - oldOffset);
      }
      render();
    }
  }

  function render() {
    frame = 0;
    if (!geometry.segment) return;
    if (!reduced.matches && innerWidth > 760) {
      const progress = clamp((scrollY - geometry.bridgeFrom) / geometry.bridgeLength);
      bridgeImage.style.setProperty('--scene-inset', `${8 * (1 - progress)}%`);
      bridgeImage.style.setProperty('--scene-radius', `${24 * (1 - progress)}px`);
    } else {
      bridgeImage.style.removeProperty('--scene-inset');
      bridgeImage.style.removeProperty('--scene-radius');
    }
    if (horizontal) {
      const raw = clamp((scrollY - geometry.top) / geometry.segment, panels.length - 1);
      const base = Math.floor(raw);
      // Leave each industry still for reading before moving to the next one.
      const moving = clamp((raw - base - .36) / .64);
      const eased = moving * moving * (3 - 2 * moving);
      const position = Math.min(panels.length - 1, base + eased);
      track.style.transform = `translate3d(${-position * geometry.width}px,0,0)`;
      panels.forEach((panel, index) => {
        const offset = Math.max(-1, Math.min(1, index - position));
        const direction = index % 2 ? -1 : 1;
        panel.style.setProperty('--overview-shift', `${offset * 42 * direction}px`);
        panel.style.setProperty('--scene-drift', `${offset * -12 * direction}px`);
      });
      select(Math.round(position));
    } else {
      const line = innerHeight * .4;
      let index = 0;
      panels.forEach((panel, i) => { if (panel.getBoundingClientRect().top <= line) index = i; });
      select(index);
    }
  }

  function request() { if (!frame) frame = requestAnimationFrame(render); }

  function visit(index, {focus = false, history = false} = {}) {
    if (index < 0 || index >= panels.length) return;
    jump(horizontal ? geometry.top + index * geometry.segment : topOf(panels[index]) - toolbar.offsetHeight);
    render();
    if (history && location.hash !== `#${panels[index].id}`) window.history.pushState(null, '', `#${panels[index].id}`);
    if (focus) panels[index].querySelector('h2').focus({preventScroll:true});
  }

  function followHash() {
    const index = panels.findIndex(panel => location.hash === `#${panel.id}`);
    if (index >= 0) visit(index);
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    const index = panels.findIndex(panel => link?.hash === `#${panel.id}`);
    if (index < 0) return;
    event.preventDefault();
    visit(index, {focus:true, history:true});
  });
  previous.addEventListener('click', () => visit(active - 1, {focus:true, history:true}));
  next.addEventListener('click', () => visit(active + 1, {focus:true, history:true}));
  modeButton.addEventListener('click', () => {
    forceVertical = horizontal;
    if (!forceVertical) panels.forEach(panel => { panel.querySelector('details').open = false; });
    configure();
  });
  panels.forEach(panel => panel.querySelector('details').addEventListener('toggle', event => {
    if (event.target.open && horizontal) {
      // Expanded project detail belongs in page flow, never a clipped sticky panel.
      forceVertical = true;
      configure(event.target.querySelector('summary'));
    } else measure();
  }));

  function configureReveals() {
    revealObserver?.disconnect();
    document.documentElement.classList.remove('motion-ready');
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }), {threshold:.12});
    document.documentElement.classList.add('motion-ready');
    document.querySelectorAll('[data-reveal]').forEach(element => revealObserver.observe(element));
  }

  addEventListener('scroll', request, {passive:true});
  addEventListener('resize', () => configure(null, true), {passive:true});
  addEventListener('hashchange', followHash);
  addEventListener('popstate', followHash);
  reduced.addEventListener('change', () => { configureReveals(); configure(); });
  // Opening an earlier disclosure changes the section's vertical position.
  document.querySelectorAll('details:not(.case-details)').forEach(detail => detail.addEventListener('toggle', measure));
  document.documentElement.classList.add('js-ready');
  configureReveals();
  configure();
  document.fonts.ready.then(() => { measure(); followHash(); });
})();

/* Progressive enhancement: a fictional reading, review and follow-up. */

(() => {
 document.querySelectorAll('[data-pfw]').forEach(root => {
  const tabs=[...root.querySelectorAll('[data-pfw-tab]')];
  const panels=[...root.querySelectorAll('[data-pfw-panel]')];
  const select=(index,focus=false)=>{
   tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});
   panels.forEach((panel,i)=>{panel.hidden=i!==index;});
   if(focus)tabs[index].focus();
  };
  panels.forEach((panel,i)=>{panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tabs[i].id);panel.tabIndex=0;});
  tabs.forEach((tab,i)=>{
   tab.addEventListener('click',()=>select(i));
   tab.addEventListener('keydown',event=>{
    let next=i;
    if(event.key==='ArrowRight')next=(i+1)%tabs.length;
    else if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=tabs.length-1;
    else return;
    event.preventDefault();select(next,true);
   });
  });
  select(0);root.querySelector('.pfw-tabs').hidden=false;
 });
})();
