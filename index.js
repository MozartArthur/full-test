  (() => {
  const inputY = document.querySelector("[name=y-fn]");
  const submit = document.querySelector("[type=submit]");
  const example = document.querySelector("[type=button]");
  const canvas1 = document.querySelector("#cartesian");
  const canvas2 = document.querySelector("#polar");
  const cartesianGl = canvas1.getContext("webgl");
  const polarGl = canvas2.getContext("webgl");

  if (!cartesianGl || !polarGl) {
    return alert(
      "Sorry, your system doesn't seem to support WebGL"
    );
  }
  
  const unitsPerAxe = 8;
  const renderCartesian = initGl(cartesianGl, unitsPerAxe);
  const renderPolar = initGl(polarGl, unitsPerAxe);

  setAndDraw("0.5t");

  submit.addEventListener("click", event => {
    event.preventDefault();
    draw(inputY.value);
  });

  const examples = [
    ["0.5t"],
    ["2*2^(0.1t)"],
    ["1 - sin(t)"],
    ["1/(1 - cos(t))"],
    ["4 * sin(11t)"],
    ["(1.2 + 1.9 * cos(1.8 * t) + 0.1 * cos(0.9 * t))"],
    ["4 * sin(17/11t)"],
    ["e^sin(t) - 2cos(4t) + sin((2t-pi)/24)^5"],
    ["2sin(25t) - 2cos(40t)"],
    ["0.2(2cos(7t^2)+t)"],
    ["0.05*cos(20*t) + 0.15*sin(20*t) + 2.2*atan(t/30)"],
  ];

  (() => {
    let exampleIndex = 1;

    example.addEventListener("click", () => {
      const [exY] = examples[exampleIndex];
      setAndDraw(exY)
      exampleIndex = exampleIndex < examples.length-1
        ? exampleIndex+1
        : 0;
    });
  })();

  function setAndDraw(exprY) {
    inputY.value = exprY;
    draw(exprY);
  }

  function draw(exprY) {
    const compiledY = window.math.compile(exprY);
    drawCartesian(
      compiledY,
      unitsPerAxe,
      renderCartesian
    );
    drawPolar(
      compiledY,
      unitsPerAxe,
      renderPolar
    );
  }
})();

function initGl(gl, unitsPerAxe) {
  setupResize(gl);

  const vertexShaderSource = `
    attribute vec2 a_position;
    uniform float u_scale;
    void main() {
      gl_Position = vec4(a_position.xy / u_scale, 0, 1);
    }
  `;
  const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
      gl_FragColor = u_color;
    }
  `;
  const vertexShader = createShader(
    gl,
    gl.VERTEX_SHADER,
    vertexShaderSource
  );
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );
  const program = createProgram(
    gl,
    vertexShader,
    fragmentShader
  );
  const positionAttributeLocation = gl.getAttribLocation(
    program,
    "a_position"
  );
  const scaleUniformLocation = gl.getUniformLocation(
    program,
    "u_scale"
  );
  const colorUniformLocation = gl.getUniformLocation(
    program,
    "u_color"
  );
  const positionBuffer = gl.createBuffer();

  gl.useProgram(program);
  gl.uniform1f(scaleUniformLocation, unitsPerAxe / 2);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(
    positionAttributeLocation,
    2,        
    gl.FLOAT, 
    false,   
    0,       
    0,        
  );

  return makeRender(gl, colorUniformLocation);
}

function setupResize(gl) {
  function resize() {
    gl.canvas.style.height = gl.canvas.clientWidth;
    gl.canvas.width = gl.canvas.clientWidth;
    gl.canvas.height = gl.canvas.clientHeight;
  }

  resize();
  window.addEventListener("resize", resize);
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(
    shader,
    gl.COMPILE_STATUS
  );

  if (!success) {
    const log = gl.getShaderInfoLog(shader);
    const kind = type === gl.VERTEX_SHADER
      ? "vertex"
      : "fragment";

    gl.deleteShader(shader);

    throw new Error(`Error in ${kind} shader: ${log}`);
  }

  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(
    program,
    gl.LINK_STATUS
  );

  if (!success) {
    const log = gl.getProgramInfoLog(program);

    gl.deleteProgram(program);

    throw new Error(`Error while linking program: ${log}`);
  }

  return program;
}

function makeRender(gl, colorUniformLocation) {
  return (objects)  => {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    objects.forEach(({ components, primitive, color }) => {
      gl.uniform4f(colorUniformLocation, ...color);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(components),
        gl.STATIC_DRAW
      );
      gl.drawArrays(
        primitive,
        0,
        components.length / 2
      );
    });
  };
}

function getBasis(unitsPerAxe) {
  const semiAxisUnits = unitsPerAxe / 2;
  const axes = {
    primitive: WebGLRenderingContext.LINES,
    color: [0.2, 0.2, 0.2, 1],
    components: [
      -semiAxisUnits, 0,
      semiAxisUnits, 0,
      0, semiAxisUnits,
      0, -semiAxisUnits
    ]
  };

  for (let i = -semiAxisUnits; i < semiAxisUnits; ++i) {
    axes.components.push(i, 0.06, i, -0.06); // x mark
    axes.components.push(-0.06, i, 0.06, i); // y mark
  }

  return axes;
}

function drawCartesian(exprY, unitsPerAxe, render) {
  
const components = [];

for (let t = -1000; t < 1000; t += 0.05) {
const y = exprY.eval({ t });
components.push(t, y);
}

draw(components, unitsPerAxe, render);
}

function drawPolar(exprY, unitsPerAxe, render) {
  const components = [];

    for (let t = -500; t < 500; t += 0.02)  {
    const radius = exprY.eval({ t });

    if (radius < 0) {
      continue;
    }

    const x = radius * Math.cos(t);
    const y = radius * Math.sin(t);

    components.push(x, y);
  }

  draw(components, unitsPerAxe, render);
}


function draw(components, unitsPerAxe, renderFunc) {
  return renderFunc([
    getBasis(unitsPerAxe),
    {
      primitive: WebGLRenderingContext.LINE_STRIP,
      color: [ 0.1, 0.5, 0.1, 1 ],
      components
    }
  ]);
}
