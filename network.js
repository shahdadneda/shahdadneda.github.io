(() => {
  const canvas = document.getElementById("network-background");
  const context = canvas?.getContext("2d", { alpha: true });

  if (!context) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const softColor = "201, 195, 184";
  const accentColor = "224, 164, 88";

  let width = 0;
  let height = 0;
  let particles = [];
  let connectionDistance = 145;
  let animationFrame = 0;
  let resizeFrame = 0;

  function createParticles() {
    const spacing = Math.max(95, Math.min(145, Math.sqrt((width * height) / 95)));
    const columns = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;

    connectionDistance = spacing * 1.55;
    particles = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const wave = Math.sin(column * 0.78 + row * 0.35) * spacing * 0.12;

        particles.push({
          x: column * spacing - spacing * 0.35 + (Math.random() - 0.5) * spacing * 0.48,
          y: row * spacing - spacing * 0.35 + wave + (Math.random() - 0.5) * spacing * 0.48,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (Math.random() - 0.5) * 0.1,
          radius: 0.65 + Math.random() * 1.1,
          accent: index % 8 === 0,
        });
      }
    }
  }

  function resizeCanvas() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    createParticles();
    drawNetwork();
  }

  function moveParticles() {
    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < -20) particle.x = width + 20;
      if (particle.x > width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = height + 20;
      if (particle.y > height + 20) particle.y = -20;
    }
  }

  function drawNetwork() {
    context.clearRect(0, 0, width, height);

    for (let firstIndex = 0; firstIndex < particles.length; firstIndex += 1) {
      const first = particles[firstIndex];

      for (let secondIndex = firstIndex + 1; secondIndex < particles.length; secondIndex += 1) {
        const second = particles[secondIndex];
        const xDistance = first.x - second.x;
        const yDistance = first.y - second.y;
        const distance = Math.hypot(xDistance, yDistance);

        if (distance >= connectionDistance) continue;

        const opacity = (1 - distance / connectionDistance) * 0.2;
        const lineColor = first.accent || second.accent ? accentColor : softColor;

        context.beginPath();
        context.moveTo(first.x, first.y);
        context.lineTo(second.x, second.y);
        context.lineWidth = 0.7;
        context.strokeStyle = `rgba(${lineColor}, ${opacity})`;
        context.stroke();
      }
    }

    for (const particle of particles) {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius + (particle.accent ? 0.35 : 0), 0, Math.PI * 2);
      context.shadowBlur = particle.accent ? 8 : 0;
      context.shadowColor = particle.accent ? `rgba(${accentColor}, 0.42)` : "transparent";
      context.fillStyle = particle.accent
        ? `rgba(${accentColor}, 0.55)`
        : `rgba(${softColor}, 0.34)`;
      context.fill();
    }

    context.shadowBlur = 0;
  }

  function animate() {
    moveParticles();
    drawNetwork();
    animationFrame = window.requestAnimationFrame(animate);
  }

  function startAnimation() {
    window.cancelAnimationFrame(animationFrame);

    if (reducedMotion.matches || document.hidden) {
      drawNetwork();
      return;
    }

    animate();
  }

  function handleResize() {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeCanvas();
      startAnimation();
    });
  }

  window.addEventListener("resize", handleResize, { passive: true });
  document.addEventListener("visibilitychange", startAnimation);
  reducedMotion.addEventListener("change", startAnimation);

  resizeCanvas();
  startAnimation();
})();
