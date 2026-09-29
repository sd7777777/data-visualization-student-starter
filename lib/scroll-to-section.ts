/** Reveal optional content before measuring its position or moving keyboard focus. */
export function scrollToSection(
  id: string,
  options: { behavior?: ScrollBehavior } = {},
) {
  const target = document.getElementById(id);
  if (!target) return;
  let parent = target.parentElement;
  while (parent) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
    parent = parent.parentElement;
  }
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  target.scrollIntoView({
    behavior:
      options.behavior ??
      (window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth'),
  });
}
