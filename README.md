# Uso de canvas en un WebComponent

Antes de empezar a escribir, recomendar un canal de youtube de Frank https://www.youtube.com/channel/UCEqc149iR-ALYkGM6TG-7vQ, que contiene muchos e interesantes vídeos sobre Canvas sin librerías, con javascript nativo. Están muy bien explicados desde 0 y aumentando complejidad

## Arrancar proyecto con ParcelJS

Sobre la raiz del proyecto, con ParcelJS instalado (Yo tengo instalada la versión 1.12.5)

```sh
parcel index.html
```

## Creación de partículas

La clase de utilidad <code>Particle</code> es encargada de crear un círculo, permitiendo definir su:

<ul class="list-bullets">
  <li>Su posicionamiento mediante <code>x</code> e <code>y</code></li>
  <li>Su color de relleno</li>
</ul>

Además, le pasamos por parámetro el contexto 2D <code>ctx</code> para usarlo desde la clase <code>CanvasDraw</code>

```javascript
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
  //...
}
```

Tenemos otros atributos que se dan valor y actualizan dentro de la misma clase:

<ul class="list-bullets">
  <li><code>size</code>: tamaño inicial de la partícula</li>
  <li><code>speedX</code> y <code>speedY</code>: dirección del movimiento(*)</li>
</ul>

(\*) Por anticipar lo que veremos más adelante. Lo que realmente se hace es actualizar la posición de <code>x</code> e <code>y</code> de la partícula en función de los valores de <code>speedX</code> y <code>speedY</code> y volver a pintarlo con <code>requestAnimationFrame()</code> dando la sensación de movimiento

Tenemos dos métodos accesibles desde fuera:

<ul class="list-bullets">
  <li><code>update()</code>: actualiza las propiedades de las partículas</li>
  <li><code>draw()</code>: pinta las partículas</li>
</ul>

```javascript
class Particle {
  //...
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
```

En el método <code>update()</code> modificamos la posición de la partícula y su tamaño

El método <code>draw()</code> sirve para (re) dibujar la partícula tras los cambios de sus propiedades

## Creación del WebComponent

### Definición de nuestra etiqueta

Creamos nuestra clase tipo PascalCase extendiendo de <code>HTMLElement</code> y se define <code>customElements.define("canvas-draw", CanvasDraw);</code>, teniendo el cuenta que el primer parámetro será el nombre de la etiqueta (con al menos un guión medio) y el segundo parámetro será el nombre de la clase (que tendrá toda la lógica)

```javascript
class CanvasDraw extends HTMLElement {
  constructor() {
    super();
  }
}

customElements.define("canvas-draw", CanvasDraw);
```

### Atributos del WebComponent

Se han usado cuatro atributos.

Dos de ellos, <code>#particlesArray</code> y <code>#animating</code> para almacenar la cantidad de partículas creadas y para bloquear/liberar la animación

Los otros dos atributos <code>particles</code> y <code>maxDistanceJoinParticles</code> para definir cuantas partículas tendrá el <code>canvas</code> y para unir las partículas mediante una línea cuando la distancía entre ellas no supera cierto valor.

Los dos últimos atributos comentados están inicializados con valor por defecto, pero pueden ser definidos otros valores desde la vista HTML. Esta situación, customizable desde HTML, requiere que lo especifiquemos en la implementación de los métodos:

<ul class="list-bullets">
  <li><code>static get observedAttributes()</code>: incluimos en el array aquellos atributos que pudieran ser modificados</li>
  <li><code>attributeChangedCallback(name, oldValue, newValue)</code>: asignamos al atributo su nuevo valor</li>
</ul>

```javascript
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
    //...
  }
  //...
}
```

### Definición del constructor y HTML del WebComponent

En en constructor de clase añadimos <code>shadow</code> en modo abierto <code>this.attachShadow({ mode: "open" })</code>. Iniciamos el canvas y el contexto 2D como null

Seleccionamos todos los elementos del DOM (con clase <code>js-particles</code>) que serán los encargados de iniciar las animaciones canvas

El método <code>render</code> se llama al final del constructor. Este método es el encargado de dar estilos al canvas y de añadirlo al DOM. También sacamos una referencia al contexto canvas para poder usarlo más adelante <code>this.ctx = this.canvas.getContext("2d");</code>

Sobre estilos, comentar que lo único importante es que el <code>canvas</code> está posicionado como fixed ocupando toda la pantalla, como bloque, sin color y anulando eventos click

```javascript
class CanvasDraw extends HTMLElement {
  //...

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.canvas = null;
    this.ctx = null;
    this.btns = document.querySelectorAll(".js-particles");

    this.render();
  }

  //...

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

  //...
}
```

### Registro de eventos del WebComponent

La animación se dispara cuando hacemos <code>mousedown</code> sobre aquellos elementos con clase <code>js-particles</code>. Añadimos y quitamos el <code>listener</code> en los métodos <code>connectedCallback()</code> y <code>disconnectedCallback()</code> respectivamente

Hemos creado la función auxiliar <code>\_handlerMouseDown(event)</code> para que sea más fácil registrar y eliminar el evento. Este método se dispara si actualmente no existe ninguna animación de partículas. (Se trata de animaciones canvas, si lanzamos muchas animaciones podría consumir muchos recursos el navegador)

Obtenemos aquí tres datos para la definición de las partículas:

<ul class="list-bullets">
  <li><code>event.x</code> y <code>event.y</code>: obtenemos las coordenadas x e y asociadas al evento</li>
  <li><code>cssObj.getPropertyValue("background-color")</code>: obtenemos el color de fondo del elemento <code>js-particles</code> sobre el que se hizo click</li>
</ul>

Creamos tantas partículas como se indicasen en su atributo <code>this.particles</code> y lo guardamos en un array <code>this.#particlesArray</code> para saber cuando todas las partículas desaparecerán

El método <code>\_animate()</code> lo dejamos para comentarlo en el siguiente punto

```javascript
class CanvasDraw extends HTMLElement {
  //...

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

  //...

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

  //...
}
```

Si has observado el código de arriba, habrás visto que este método <code>\_calculateCanvasSize()</code> no lo he mencionado. Es para asignar el tamaño del canvas, haciéndolo justo en este punto, momento del mousedown, nos ahorramos tener que user eventos <code>resize</code>

### Animaciones Canvas del WebComponent

El método <code>\_animate()</code> es el encargado de generar la animación, se ejecuta 60fps ya que hace llamada a <code>requestAnimationFrame()</code>. Cada vez que entra se limpia el lienzo y se hace llamada a la función <code>\_handleParticles()</code> para actualizar partículas que en seguida veremos. Esta animación no se para hasta que detectamos que el array de partículas <code>this.#particlesArray</code> ha quedado vacío, cuando ha quedado vacío cambiamos <code>this.#animating = false</code> a false para que se pueda iniciar nuevas animaciones y volvemos a limpiar el lienzo

El método <code>\_handleParticles</code> recorre el array de partículas creadas y las actualiza haciendo llamada a los métodos <code>update()</code> y <code>draw()</code> de la clase <code>Particles</code>. Si el tamaño de las partículas es menor a uno dado (en nuestro caso es <code>if (this.#particlesArray[i].size <= 0.2)</code>) entonces lo quitamos del array. El bucle <code>for</code> interior es auxiliar para añadir algo más a la. En este caso, lo que añade es una línea que une aquellas partículas próximas entre sí, con el requisito de que su distancia sea menor a una dada <code>this.maxDistanceJoinParticles</code> (recuerda de más arriba, este era uno de los valores personalizables comoa tributos del WebComponent)

```javascript
class CanvasDraw extends HTMLElement {
  //...

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

  //...
}
```

## Codepen del WebComponent

En este PEN puede verse el <a href="https://codepen.io/ivan_albizu/pen/LYzvxqz" target="_blank" rel="noopener">WebComponente funcionando</a>

## Github del Webcomponent

En este repositorio puede verse el <a href="https://github.com/ivanalbizu/webcomponent-canvas-particles" target="_blank" rel="noopener">código del Webcomponente</a>
