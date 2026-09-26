/* ============================================================
   LAIMAO® — Hero WebGL 着色器（原创 · 零依赖）
   视觉来源：头像三要素 —— 朱红底 / 细线圆环 / 天蓝连帽衫
   朱红墨色 fbm 流场 + 圆环光晕 + 半调点阵 + 胶片颗粒
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("shaderCanvas");
  if (!canvas) return;

  var gl =
    canvas.getContext("webgl", { antialias: false, alpha: false }) ||
    canvas.getContext("experimental-webgl");
  if (!gl) {
    canvas.style.display = "none"; // 回退：hero 自带墨黑底色
    return;
  }

  /* ---------- 着色器源码 ---------- */
  var VERT_SRC = [
    "attribute vec2 aPos;",
    "void main(){",
    "  gl_Position = vec4(aPos, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FRAG_SRC = [
    "precision highp float;",
    "uniform vec2  uRes;",
    "uniform float uTime;",
    "uniform vec2  uMouse;",

    "float hash(vec2 p){",
    "  p = fract(p * vec2(234.34, 435.345));",
    "  p += dot(p, p + 34.23);",
    "  return fract(p.x * p.y);",
    "}",

    "float noise(vec2 p){",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  float a = hash(i);",
    "  float b = hash(i + vec2(1.0, 0.0));",
    "  float c = hash(i + vec2(0.0, 1.0));",
    "  float d = hash(i + vec2(1.0, 1.0));",
    "  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);",
    "}",

    "float fbm(vec2 p){",
    "  float v = 0.0;",
    "  float a = 0.5;",
    "  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);",
    "  for(int i = 0; i < 5; i++){",
    "    v += a * noise(p);",
    "    p = rot * p * 2.03 + vec2(3.1, 1.7);",
    "    a *= 0.5;",
    "  }",
    "  return v;",
    "}",

    "void main(){",
    "  float mn = min(uRes.x, uRes.y);",
    "  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / mn;",
    "  vec2 m  = (uMouse - 0.5 * uRes) / mn;",
    "  float t = uTime * 0.06;",

    /* 鼠标扰动力场 */
    "  float md = length(uv - m);",
    "  vec2 push = normalize(uv - m + 1e-4) * exp(-md * 4.0) * 0.10;",

    /* 双层域扭曲流场 */
    "  vec2 q = uv + push;",
    "  float n1 = fbm(q * 1.9 + vec2(t * 0.7, -t));",
    "  float n2 = fbm(q * 3.4 - vec2(t * 0.4, t * 0.9) + n1 * 1.4);",

    /* 调色板：取自头像 */
    "  vec3 ink   = vec3(0.086, 0.066, 0.051);",
    "  vec3 verm  = vec3(0.910, 0.322, 0.231);",
    "  vec3 coral = vec3(0.960, 0.478, 0.310);",
    "  vec3 cream = vec3(0.957, 0.933, 0.886);",
    "  vec3 sky   = vec3(0.737, 0.843, 0.961);",

    "  vec3 col = mix(ink, verm, smoothstep(0.18, 0.92, n1));",
    "  col = mix(col, coral, smoothstep(0.55, 1.0, n2) * 0.55);",

    /* 主圆环：头像细线圆 motif */
    "  float r = length(uv - vec2(0.10, 0.04));",
    "  float ring = abs(r - 0.365);",
    "  col += cream * exp(-ring * 260.0) * 0.85;",
    "  col += verm  * exp(-ring * 60.0) * 0.18;",

    /* 天蓝弧：连帽衫的蓝 */
    "  float r2 = length((uv - vec2(-0.42, -0.16)) * vec2(1.0, 0.94));",
    "  col += sky * exp(-abs(r2 - 0.62) * 300.0) * 0.30;",

    /* 半调点阵 */
    "  vec2 gp = fract((uv + push) * 46.0) - 0.5;",
    "  float dotg = smoothstep(0.10, 0.04, length(gp));",
    "  col += dotg * 0.045 * smoothstep(0.2, 0.9, n1);",

    /* 呼吸 + 暗角 + 颗粒 */
    "  col *= 0.94 + 0.06 * sin(uTime * 0.5);",
    "  col *= 1.0 - 0.5 * dot(uv, uv);",
    "  float g = hash(gl_FragCoord.xy + fract(uTime) * vec2(17.0, 113.0));",
    "  col += (g - 0.5) * 0.06;",

    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  /* ---------- 编译工具 ---------- */
  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("[shader]", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT_SRC);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) {
    canvas.style.display = "none";
    return;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("[shader]", gl.getProgramInfoLog(prog));
    canvas.style.display = "none";
    return;
  }
  gl.useProgram(prog);

  /* ---------- 全屏三角形 ---------- */
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  var aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, "uRes");
  var uTime = gl.getUniformLocation(prog, "uTime");
  var uMouse = gl.getUniformLocation(prog, "uMouse");

  /* ---------- 尺寸 / 鼠标 ---------- */
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    /* 小屏设备降低渲染分辨率，保证帧率 */
    dpr = Math.min(window.devicePixelRatio || 1, canvas.clientWidth < 760 ? 1.5 : 2);
    var w = Math.floor(canvas.clientWidth * dpr);
    var h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, canvas.width, canvas.height);
    if (mouse.tx === 0 && mouse.ty === 0) {
      mouse.x = mouse.tx = canvas.width / 2;
      mouse.y = mouse.ty = canvas.height / 2;
    }
  }

  window.addEventListener(
    "mousemove",
    function (e) {
      var rect = canvas.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      )
        return;
      mouse.tx = (e.clientX - rect.left) * dpr;
      mouse.ty = (rect.height - (e.clientY - rect.top)) * dpr; // 翻转到 GL 坐标
    },
    { passive: true }
  );

  /* ---------- 渲染循环（可暂停） ---------- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var running = false;
  var inView = true;
  var start = performance.now();

  function frame() {
    if (!running) return;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    gl.uniform1f(uTime, (performance.now() - start) / 1000 + 37.0);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }

  function play() {
    if (!running && inView && !document.hidden) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  function stop() {
    running = false;
  }

  if (reduced) {
    // 静态一帧：保留视觉，去除动效
    resize();
    gl.uniform1f(uTime, 12.0);
    gl.uniform2f(uMouse, canvas.width * 0.5, canvas.height * 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    window.addEventListener("resize", function () {
      resize();
      gl.uniform1f(uTime, 12.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
  } else {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        inView ? play() : stop();
      }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : play();
    });
    window.addEventListener(
      "resize",
      function () {
        resize();
      },
      { passive: true }
    );
    resize();
    play();
  }

  /* ---------- 上下文丢失兜底 ---------- */
  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    stop();
  });
})();
