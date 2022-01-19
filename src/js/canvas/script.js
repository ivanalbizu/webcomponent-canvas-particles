/** @type {HTMLCanvasElement} */

class Particle {
  constructor(ctx, x, y, fillStyle) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.fillStyle = fillStyle;

    this.size = Math.random() * 16 + 1;
    this.speedX = Math.random() * 10 - 5;
    this.speedY = Math.random() * 10 - 5;
    this.color = fillStyle;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.size > 0.2) this.size -= 0.2;
  }
  draw() {
    this.ctx.fillStyle = this.fillStyle;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

class CanvasDraw extends HTMLElement {
  #particlesArray = [];
  #animating = false;
  particles = 40;
  maxDistanceJoinParticles = 80;

  static get observedAttributes() {
    return ["particles", "max-distance-join-particles"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "particles") {
      this.particles = newValue || 100;
    } else if (name === "max-distance-join-particles") {
      this.maxDistanceJoinParticles = newValue || 80;
    }
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.canvas = null;
    this.ctx = null;
    this.btns = document.querySelectorAll(".js-particles");

    this.render();
  }

  connectedCallback() {
    this.btns.forEach((btn) => {
      btn.addEventListener("mousedown", this._handlerMouseDown.bind(this));
    });
  }
  disconnectedCallback() {
    this.btns.forEach((btn) => {
      btn.removeEventListener("mousedown", this._handlerMouseDown.bind(this));
    });
  }

  render() {
    const style = document.createElement("style");
    style.textContent = `
      canvas-draw {
        display: block;
        overflow: hidden;
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
    `;
    this.appendChild(style);

    this.canvas = document.createElement("canvas");
    this.shadowRoot.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
  }

  _handleParticles() {
    for (let i = 0; i < this.#particlesArray.length; i++) {
      this.#particlesArray[i].update();
      this.#particlesArray[i].draw();

      for (let j = i; j < this.#particlesArray.length; j++) {
        const dx = this.#particlesArray[i].x - this.#particlesArray[j].x;
        const dy = this.#particlesArray[i].y - this.#particlesArray[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < this.maxDistanceJoinParticles) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = this.#particlesArray[i].color;
          this.ctx.lineWidth = 0.2;
          this.ctx.moveTo(this.#particlesArray[i].x, this.#particlesArray[i].y);
          this.ctx.lineTo(this.#particlesArray[j].x, this.#particlesArray[j].y);
          this.ctx.stroke();
          this.ctx.closePath();
        }
      }
      if (this.#particlesArray[i].size <= 0.2) {
        this.#particlesArray.splice(i, 1);
        i--;
      }
    }
  }

  _handlerMouseDown(event) {
    if (this.#animating) return;
    this.#animating = true;
    this._calculateCanvasSize();
    const cssObj = window.getComputedStyle(event.target, null);
    const bgColor = cssObj.getPropertyValue("background-color");
    for (let i = 0; i < this.particles; i++) {
      this.#particlesArray.push(
        new Particle(this.ctx, event.x, event.y, bgColor)
      );
    }
    this._animate();
  }

  _calculateCanvasSize() {
    this.canvas.width = this.clientWidth;
    this.canvas.height = this.clientHeight;
  }

  _animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this._handleParticles();
    if (this.#particlesArray.length > 0) {
      requestAnimationFrame(this._animate.bind(this));
    } else {
      this.#animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

customElements.define("canvas-draw", CanvasDraw);
