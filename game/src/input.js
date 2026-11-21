export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const input = {
    held,
    pressed,
    mouse: { x: 850, y: 360, down: false },
    down: code => held.has(code),
    tap: code => pressed.has(code),
    axis: (negative, positive) => Number(held.has(positive)) - Number(held.has(negative)),
    clear: () => pressed.clear(),
  };
  if (typeof window === 'undefined') return input;
  window.addEventListener('keydown', event => {
    if (!held.has(event.code)) pressed.add(event.code);
    held.add(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', event => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    input.mouse.down = false;
  });
  canvas.addEventListener('mousemove', event => {
    const box = canvas.getBoundingClientRect();
    input.mouse.x = (event.clientX - box.left) * 1280 / box.width;
    input.mouse.y = (event.clientY - box.top) * 720 / box.height;
  });
  canvas.addEventListener('mousedown', () => {
    input.mouse.down = true;
    pressed.add('Mouse');
  });
  window.addEventListener('mouseup', () => input.mouse.down = false);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  return input;
}
