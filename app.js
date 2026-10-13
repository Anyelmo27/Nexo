// NEXO AI v0.8 — holograma estilo Jarvis con IA (Gemini en streaming), voz, micrófono, cámara y agente local del PC.
(function () {
  "use strict";
  var NOMBRE = "Anyel";
  var MODELOS = ["gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-flash-latest"], TTS = "gemini-3.1-flash-tts-preview";
  var API = "https://generativelanguage.googleapis.com/v1beta/models/", AG = "http://127.0.0.1:8765/accion";
  function $(id) { return document.getElementById(id); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function R() { return Math.random(); }
  function lim(x, a, b) { return Math.min(b, Math.max(a, +x)); }

  // ---------- Estados (paleta cálida tipo Jarvis) ----------
  function S(n, amp, rad, spd, br, wave, c) { return { n: n, amp: amp, rad: rad, spd: spd, br: br, wave: wave, c: c }; }
  var E = {
    reposo:     S("Reposo",     .6,  1,    .8,  .8,  .15, [1,.42,.06, 1,.72,.22, .85,.2,.02]),
    escucha:    S("Escucha",    .8,  1.06, .9,  1,   .1,  [1,.55,.1, 1,.85,.35, .95,.35,.05]),
    procesando: S("Procesando", 1.2, .92,  2.2, 1,   .5,  [1,.35,.05, 1,.9,.5, 1,.6,.1]),
    respuesta:  S("Respuesta",  .85, 1,    1.2, 1,   1,   [1,.5,.08, 1,.85,.4, .95,.3,.05]),
    feliz:      S("Feliz",      1,   1.04, 1.4, 1,   .7,  [1,.6,.1, 1,.92,.45, 1,.45,.05]),
    preocupado: S("Preocupado", .8,  .95,  .7,  .85, .2,  [.85,.3,.1, 1,.55,.3, .6,.12,.12]),
    error:      S("Error",      1.3, .98,  .5,  .95, 0,   [.95,.1,.2, 1,.4,.35, .6,.05,.25])
  };
  var K = ["amp", "rad", "spd", "br", "wave"];
  var actual = "reposo", v = { c: E.reposo.c.slice() }, tinte = null, emo = null;
  K.forEach(function (k) { v[k] = E.reposo[k]; });
  var etiqueta = $("estado");
  function fijar(c) { if (!E[c]) return false; actual = c; etiqueta.textContent = E[c].n; return true; }

  // ---------- Formas ----------
  var MAX = 16000;
  function esf() { var z = R() * 2 - 1, th = R() * 6.2832, r = Math.sqrt(1 - z * z); return [Math.cos(th) * r, Math.sin(th) * r, z]; }
  function poligono(P) {
    var xs = P.map(function (p) { return p[0]; }), ys = P.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    var k = 1.8 / Math.max(x1 - x0, y1 - y0, 1e-6), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var Q = P.map(function (p) { return [(p[0] - cx) * k, (p[1] - cy) * k]; }), n = Q.length;
    function dentro(x, y) { var c = false; for (var i = 0, j = n - 1; i < n; j = i++) if ((Q[i][1] > y) !== (Q[j][1] > y) && x < (Q[j][0] - Q[i][0]) * (y - Q[i][1]) / (Q[j][1] - Q[i][1]) + Q[i][0]) c = !c; return c; }
    return function () {
      if (R() < .35) { var i = (R() * n) | 0, a = Q[i], b = Q[(i + 1) % n], u = R(); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, (R() - .5) * .18]; }
      for (var t = 0; t < 40; t++) { var x = (R() * 2 - 1) * .9, y = (R() * 2 - 1) * .9; if (dentro(x, y)) return [x, y, (R() - .5) * .3]; }
      return [0, 0, 0];
    };
  }
  var estrellaPts = []; for (var si = 0; si < 10; si++) estrellaPts.push([(si % 2 ? .42 : 1) * Math.cos(Math.PI / 2 + si * Math.PI / 5), (si % 2 ? .42 : 1) * Math.sin(Math.PI / 2 + si * Math.PI / 5)]);
  var FORMAS = {
    esfera: esf,
    cubo: function () { var p = [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1], a = (R() * 3) | 0; p[a] = p[a] < 0 ? -1 : 1; return p.map(function (x) { return x * .64; }); },
    toroide: function () { var u = R() * 6.2832, w = R() * 6.2832, q = .72 + .28 * Math.cos(w); return [q * Math.cos(u), q * Math.sin(u), .28 * Math.sin(w)]; },
    corazon: function () { var t = R() * 6.2832, s = Math.sqrt(R()), x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); return [x / 18 * s, (y + 2.5) / 18 * s, (R() - .5) * .55 * Math.sqrt(1 - s * s * .8)]; },
    estrella: poligono(estrellaPts),
    galaxia: function () { var a = (R() * 2 | 0) * Math.PI, r = Math.pow(R(), .75), t = r * 5.5 + a + (R() - .5) * .6; return [r * Math.cos(t), r * Math.sin(t) * .5 + (R() - .5) * .08, r * Math.sin(t) * .6]; },
    piramide: function () { var c = (R() * 4) | 0, a = [0, .8, 0], b = [[-.7,-.5,-.7],[.7,-.5,-.7],[.7,-.5,.7],[-.7,-.5,.7]], p = b[c], q = b[(c + 1) % 4], u = R(), w = R(); if (u + w > 1) { u = 1 - u; w = 1 - w; } return [0, 1, 2].map(function (i) { return a[i] + (p[i] - a[i]) * u + (q[i] - a[i]) * w; }); },
    cilindro: function () { var u = R() * 6.2832; if (R() < .2) { var r = Math.sqrt(R()) * .55, y = R() < .5 ? -.8 : .8; return [r * Math.cos(u), y, r * Math.sin(u)]; } return [.55 * Math.cos(u), (R() * 2 - 1) * .8, .55 * Math.sin(u)]; },
    adn: function () { var t = R() * 2 - 1, a = t * 9; if (R() < .2) { var s = R() * 2 - 1; return [.5 * Math.cos(a) * s, t * .95, .5 * Math.sin(a) * s]; } var f = R() < .5 ? 0 : Math.PI; return [.5 * Math.cos(a + f), t * .95, .5 * Math.sin(a + f)]; },
    anillo: function () { var u = R() * 6.2832, r = .85 + (R() - .5) * .1; return [r * Math.cos(u), r * Math.sin(u), (R() - .5) * .1]; }
  };
  var ALIAS = { bola: "esfera", circulo: "esfera", caja: "cubo", toro: "toroide", dona: "toroide", rosquilla: "toroide", espiral: "galaxia", helice: "adn", aro: "anillo" };
  var rnd = new Float32Array(MAX * 2); for (var ri = 0; ri < MAX * 2; ri++) rnd[ri] = R();
  function generar(g) { var a = new Float32Array(MAX * 3); for (var i = 0; i < MAX; i++) { var p = g(); a[i * 3] = p[0]; a[i * 3 + 1] = p[1]; a[i * 3 + 2] = p[2]; } return a; }
  var src = generar(esf), tgt = src, morph = 1, rough = 1, roughT = 1;

  // ---------- WebGL ----------
  var VS = [
    "attribute vec2 aR;attribute vec3 aS,aT;",
    "uniform float uT,uAsp,uScale,uAmp,uRad,uWave,uPulse,uDPR,uSwap,uPS,uGlitch,uMorph,uRough,uOff;",
    "uniform vec2 uRot,uPtr,uFlip;uniform vec3 uC1,uC2,uC3;",
    "varying vec3 vC;varying float vA;",
    "void main(){",
    " float t=uT;",
    " float m=smoothstep(0.,1.,clamp(uMorph*1.5-aR.x*.5,0.,1.));",
    " vec3 d0=mix(aS,aT,m);",
    " float sw=t*(.25+.3*uAmp)*(1.3-length(d0.xz));float cs=cos(sw),sn=sin(sw);",
    " vec3 d=vec3(cs*d0.x-sn*d0.z,d0.y,sn*d0.x+cs*d0.z);",
    " vec3 w=vec3(sin(d.y*2.6+t*.55+aR.y*6.283),sin(d.z*2.4-t*.47+aR.y*4.),sin(d.x*2.8+t*.4+aR.y*5.))",
    "  +.5*vec3(sin(d.z*5.1+t*.9),sin(d.x*4.7-t*.8),sin(d.y*5.3+t*.7));",
    " float shell=.82+uRough*.5*aR.x*aR.x*aR.x+(1.-uRough)*.1*aR.x;",
    " float pulse=1.+uPulse*.1+uWave*.05*sin(t*6.5+d.y*4.+aR.y*2.);",
    " vec3 p=d*uRad*shell*pulse+w*.07*uAmp;",
    " p+=normalize(d+vec3(.001))*uPulse*.45*step(.965,aR.y);",
    " float cy=cos(uRot.x),sy=sin(uRot.x),cx=cos(uRot.y),sx=sin(uRot.y);",
    " p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);",
    " p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);",
    " float pe=1.7/(2.4-p.z);",
    " vec2 s=p.xy*pe*uScale+vec2(0.,uOff);",
    " vec2 sd=s-uPtr;float dist=length(sd);",
    " s+=sd/(dist+.001)*exp(-dist*dist*7.)*.1;",
    " vec2 q=vec2(s.x/uAsp,s.y);",
    " q.x+=uGlitch*sin(s.y*55.+t*90.)*.03*step(.6,fract(sin(floor(s.y*14.+t*30.))*437.5));",
    " if(uSwap>.5)q=q.yx;q*=uFlip;gl_Position=vec4(q,0.,1.);",
    " vA=mix(.25,1.,(p.z+1.)*.5)*(.7+.3*sin(t*2.5+aR.y*40.));",
    " gl_PointSize=(1.1+2.*aR.x)*pe*uDPR*uPS;",
    " vC=mix(mix(uC1,uC2,d.y*.5+.5),uC3,.5+.5*sin(d.x*3.+t*.3+aR.y*6.283));",
    "}"
  ].join("\n");
  var FS = [
    "precision mediump float;varying vec3 vC;varying float vA;uniform float uBr,uInt;",
    "void main(){float r=length(gl_PointCoord-.5)*2.;float a=1.-smoothstep(0.,1.,r);",
    " a*=a*vA*uBr*uInt*.6;vec3 c=vC*a;gl_FragColor=vec4(c,max(c.r,max(c.g,c.b)));}"
  ].join("\n");
  var cv = $("lienzo"), U = {}, listo = false, buf = null;
  var gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  function compilar(tipo, s) { var h = gl.createShader(tipo); gl.shaderSource(h, s); gl.compileShader(h); if (!gl.getShaderParameter(h, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(h)); return null; } return h; }
  function subir() {
    var d = new Float32Array(MAX * 8);
    for (var i = 0; i < MAX; i++) { d[i * 8] = rnd[i * 2]; d[i * 8 + 1] = rnd[i * 2 + 1]; d.set(src.subarray(i * 3, i * 3 + 3), i * 8 + 2); d.set(tgt.subarray(i * 3, i * 3 + 3), i * 8 + 5); }
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW);
  }
  function iniciar() {
    var vs = compilar(gl.VERTEX_SHADER, VS), fs = compilar(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(pr)); return false; }
    gl.useProgram(pr); buf = gl.createBuffer(); subir();
    [["aR", 2, 0], ["aS", 3, 8], ["aT", 3, 20]].forEach(function (a) { var l = gl.getAttribLocation(pr, a[0]); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, a[1], gl.FLOAT, false, 32, a[2]); });
    ["uT","uAsp","uScale","uAmp","uRad","uWave","uPulse","uDPR","uSwap","uPS","uGlitch","uMorph","uRough","uOff","uRot","uPtr","uFlip","uC1","uC2","uC3","uBr","uInt"].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.clearColor(0, 0, 0, 0);
    return true;
  }
  if (!gl) etiqueta.textContent = "Este navegador no admite WebGL: no se puede dibujar el holograma";
  else if (!(listo = iniciar())) etiqueta.textContent = "Error al compilar el shader: abre la consola (F12)";
  var asp = 1, dpr = 1;
  function ajustar() { if (!gl) return; dpr = Math.min(window.devicePixelRatio || 1, 1); cv.width = Math.max(2, Math.round(cv.clientWidth * dpr)); cv.height = Math.max(2, Math.round(cv.clientHeight * dpr)); asp = cv.width / cv.height; gl.viewport(0, 0, cv.width, cv.height); }
  window.addEventListener("resize", ajustar); ajustar();
  function setForma(n, pts) {
    var k = String(n || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); k = ALIAS[k] || k;
    var g = FORMAS[k];
    if (!g && pts && pts.length >= 3 && pts.length <= 200 && pts.every(function (p) { return p && isFinite(p[0]) && isFinite(p[1]); })) g = poligono(pts);
    if (!g) return { ok: false, error: "No conozco esa forma y no recibí un contorno válido" };
    src = tgt; tgt = generar(g); subir(); morph = 0; roughT = k === "esfera" ? 1 : .3; return { ok: true };
  }

  // ---------- Bucle de dibujo ----------
  var ptr = [0, 0], pos = [9, 9], pS = [0, 0], pulso = 0;
  window.addEventListener("pointermove", function (e) { ptr[0] = e.clientX / innerWidth * 2 - 1; ptr[1] = e.clientY / innerHeight * 2 - 1; pos[0] = ptr[0] * asp; pos[1] = -ptr[1]; });
  window.addEventListener("pointerdown", function () { pulso = 1; });
  var reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var holo = false, inv = false, inten = 1.5, tam = .3, dist = .04, cuenta = 10000, velU = 1, escU = 1;
  var ult = 0, t = 0, ang = 0, acum = 0, cuadros = 0, pp = [9, 9], glitch = 0, sigG = 5, sigP = 2, fr = 0, raiz = document.documentElement;
  var VISTAS = [[0, 1, -1, 1, 0], [0, -1, 1, -1, 0], [1, 0, 1, 1, 1], [-1, 0, -1, -1, 1]];
  var ac = null, anS = null, anM = null, b1 = new Uint8Array(256), b2 = new Uint8Array(256), hablando = false, grabando = false, hablo = false, ultV = 0, t0 = 0, grab = null, fuente = null, pendNav = 0, streaming = false;
  function audio() { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); anS = ac.createAnalyser(); anS.fftSize = 256; anS.connect(ac.destination); anM = ac.createAnalyser(); anM.fftSize = 256; } if (ac.state === "suspended") ac.resume(); return ac; }
  function nv(an, b) { an.getByteTimeDomainData(b); var s = 0; for (var i = 0; i < b.length; i++) { var x = (b[i] - 128) / 128; s += x * x; } return Math.sqrt(s / b.length); }

  function dibujar(now) {
    requestAnimationFrame(dibujar);
    if (!listo || document.hidden) return;
    var dt = Math.min((now - ult) / 1000, .1); ult = now;
    acum += dt; if (++cuadros === 90) { if (acum / 90 > .028 && cuenta > 1500) cuenta = Math.round(cuenta * .8); acum = 0; cuadros = 0; }
    var e = E[actual], k = 1 - Math.pow(.05, dt), tc = (tinte && actual !== "error" && actual !== "preocupado") ? tinte : e.c;
    K.forEach(function (n) { v[n] += (e[n] - v[n]) * k; });
    for (var i = 0; i < 9; i++) v.c[i] += (tc[i] - v.c[i]) * k;
    rough += (roughT - rough) * k; morph = Math.min(1, morph + dt / 1.6);
    pulso -= pulso * 3 * dt;
    var nvl = 0; if (hablando && anS) nvl = nv(anS, b1); if (pendNav > 0) nvl = Math.max(nvl, .1 + .08 * Math.abs(Math.sin(t * 9)));
    if (grabando && anM) { var lm = nv(anM, b2); nvl = Math.max(nvl, lm); if (now - t0 < 450) piso = Math.max(piso * .9, lm); else { umbral = Math.max(.02, Math.min(.12, piso * 2.2)); if (lm > umbral) { hablo = true; ultV = now; } } if ((hablo && now - ultV > 1300) || (!hablo && now - t0 > 9000) || now - t0 > 30000) detenerMic(true); }
    if (nvl > .01) pulso = Math.max(pulso, Math.min(1.2, nvl * 5));
    sigP -= dt; if (sigP < 0) { pulso = Math.max(pulso, .35); sigP = 2 + R() * 3; }
    var f = reducido ? .2 : 1;
    t += dt * (.6 + .5 * v.spd * velU) * f; ang += v.spd * velU * .22 * dt * f;
    pS[0] += (ptr[0] - pS[0]) * .05; pS[1] += (ptr[1] - pS[1]) * .05;
    pp[0] += (pos[0] - pp[0]) * .2; pp[1] += (pos[1] - pp[1]) * .2;
    if (++fr % 8 === 0) raiz.style.setProperty("--rgb", Math.round(v.c[3] * 255) + "," + Math.round(v.c[4] * 255) + "," + Math.round(v.c[5] * 255));
    sigG -= dt; if (sigG < 0) { glitch = reducido ? 0 : 1; sigG = 4 + R() * 5; }
    glitch -= glitch * 7 * dt; if (glitch < .02) glitch = 0;
    var wS = lim((rough - .3) / .7, 0, 1), rx = ang * wS + Math.sin(ang * .8) * .75 * (1 - wS);
    gl.uniform1f(U.uT, t); gl.uniform1f(U.uAmp, v.amp); gl.uniform1f(U.uRad, v.rad); gl.uniform1f(U.uWave, v.wave * f);
    gl.uniform1f(U.uPulse, pulso); gl.uniform1f(U.uDPR, dpr); gl.uniform1f(U.uBr, v.br * (1 + .04 * Math.sin(t * 40)));
    gl.uniform1f(U.uInt, holo ? inten * 1.35 : inten); gl.uniform1f(U.uGlitch, glitch); gl.uniform1f(U.uMorph, morph); gl.uniform1f(U.uRough, rough);
    gl.uniform2f(U.uRot, rx + pS[0] * .6, pS[1] * .4);
    gl.uniform3f(U.uC1, v.c[0], v.c[1], v.c[2]); gl.uniform3f(U.uC2, v.c[3], v.c[4], v.c[5]); gl.uniform3f(U.uC3, v.c[6], v.c[7], v.c[8]);
    var tp = 1 + .25 * (inten - 1);
    gl.disable(gl.SCISSOR_TEST); gl.viewport(0, 0, cv.width, cv.height); gl.clear(gl.COLOR_BUFFER_BIT);
    if (!holo) {
      gl.uniform1f(U.uAsp, asp); gl.uniform1f(U.uScale, Math.min(.55, asp * .9) * escU); gl.uniform1f(U.uOff, .44); gl.uniform2f(U.uPtr, pp[0], pp[1]);
      gl.uniform2f(U.uFlip, 1, 1); gl.uniform1f(U.uSwap, 0); gl.uniform1f(U.uPS, tp);
      gl.drawArrays(gl.POINTS, 0, cuenta);
    } else {
      var W = cv.width, H = cv.height, m = Math.min(W, H), q = Math.round(m * tam), off = q / 2 + m * dist, sg = inv ? -1 : 1;
      gl.enable(gl.SCISSOR_TEST);
      gl.uniform1f(U.uAsp, 1); gl.uniform1f(U.uScale, escU); gl.uniform1f(U.uOff, 0); gl.uniform2f(U.uPtr, 9, 9); gl.uniform1f(U.uPS, Math.max(.7, q / 460) * tp);
      VISTAS.forEach(function (w) {
        var x = Math.round(W / 2 + w[0] * off - q / 2), y = Math.round(H / 2 + w[1] * off - q / 2);
        gl.viewport(x, y, q, q); gl.scissor(x, y, q, q);
        gl.uniform2f(U.uFlip, w[2] * sg, w[3] * sg); gl.uniform1f(U.uSwap, w[4]);
        gl.drawArrays(gl.POINTS, 0, cuenta);
      });
    }
  }
  requestAnimationFrame(dibujar);

  // ---------- Controles ----------
  var bHolo = $("holo"), selVoz = $("voz"), raizEl = document.documentElement;
  function ponerHolo(on) {
    holo = on; document.body.classList.toggle("holo", on); bHolo.textContent = on ? "Salir del modo holograma (H)" : "Modo holograma (H)";
    try { var p = on ? (!document.fullscreenElement && raizEl.requestFullscreen && raizEl.requestFullscreen()) : (document.fullscreenElement && document.exitFullscreen()); if (p && p.catch) p.catch(function () {}); } catch (er) {}
  }
  bHolo.addEventListener("click", function () { ponerHolo(!holo); });
  $("inv").addEventListener("click", function () { inv = !inv; });
  $("inten").addEventListener("input", function (ev) { inten = +ev.target.value; });
  $("cant").addEventListener("input", function (ev) { cuenta = +ev.target.value; });
  $("tam").addEventListener("input", function (ev) { tam = +ev.target.value; });
  $("dist").addEventListener("input", function (ev) { dist = +ev.target.value; });
  if (ls("nexo_voz")) selVoz.value = ls("nexo_voz");
  selVoz.addEventListener("change", function () { ls("nexo_voz", selVoz.value); });
  window.addEventListener("keydown", function (ev) { if (ev.target.tagName === "INPUT" || ev.target.tagName === "SELECT" || ev.ctrlKey || ev.metaKey || ev.altKey) return; if (ev.key === "h" || ev.key === "H") ponerHolo(!holo); });

  // ---------- Herramientas: holograma (locales) y PC (agente) ----------
  function mezcla(a, b, u) { return [0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * u; }); }
  function hex(h) { h = h.replace("#", ""); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) / 255; }); }
  function paleta(cs) { var a = hex(cs[0]), b = cs[1] ? hex(cs[1]) : mezcla(a, [1, 1, 1], .45), c = cs[2] ? hex(cs[2]) : (cs[1] ? mezcla(a, b, .5) : a.map(function (x) { return x * .55; })); return a.concat(b, c); }
  function local(n, a) {
    a = a || {};
    if (n === "cambiar_color") { var c = (a.colores || []).filter(function (h) { return /^#?[0-9a-f]{6}$/i.test(h); }); if (!c.length) return { ok: false, error: "Color no válido" }; tinte = paleta(c.slice(0, 3)); return { ok: true }; }
    if (n === "cambiar_forma") return setForma(a.nombre, a.puntos);
    if (n === "ajustar") {
      if (a.restablecer) { tinte = null; velU = 1; escU = 1; inten = 1.5; cuenta = 10000; $("inten").value = 1.5; $("cant").value = 10000; setForma("esfera"); return { ok: true }; }
      if (isFinite(a.brillo)) { inten = lim(a.brillo, .6, 3); $("inten").value = inten; }
      if (isFinite(a.velocidad)) velU = lim(a.velocidad, .2, 3);
      if (isFinite(a.tamano)) escU = lim(a.tamano, .5, 1.5);
      if (isFinite(a.particulas)) { cuenta = Math.round(lim(a.particulas, 2000, MAX)); $("cant").value = cuenta; }
      return { ok: true };
    }
    if (n === "sentir") { if (E[a.emocion]) { emo = a.emocion; return { ok: true }; } return { ok: false, error: "Emoción desconocida" }; }
    return { ok: false, error: "Herramienta desconocida" };
  }
  var token = ls("nexo_token") || "";
  function pedirToken() { var k = window.prompt("Pega el token del agente de NEXO (el agente lo copió al portapapeles al encenderse):", token); if (k && k.trim()) { token = k.trim(); ls("nexo_token", token); } return token; }
  $("tok").addEventListener("click", pedirToken);
  function agente(n, a) {
    if (!token && !pedirToken()) return Promise.resolve({ ok: false, error: "Falta el token del agente." });
    return fetch(AG, { method: "POST", headers: { "Content-Type": "application/json", "X-Nexo-Token": token }, body: JSON.stringify(Object.assign({ accion: n }, a || {})) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.error === "Token inválido.") { token = ""; ls("nexo_token", null); } return j; })
      .catch(function () { var o = location.origin, bien = /^http:\/\/(127\.0\.0\.1|localhost):55(0[0-5])$/.test(o); return { ok: false, error: bien ? "No llego al agente de NEXO. Ábrelo con iniciar-agente.bat y deja su ventana abierta." : "Esta página está en " + o + " y el agente solo acepta http://127.0.0.1:5500 (Live Server). Ábrela desde ahí, no como archivo ni desde otra dirección." }; });
  }
  var PC = { abrir_app: 1, abrir_ruta: 1, listar_carpeta: 1, crear_carpeta: 1, escribir_archivo: 1, bloc_de_notas: 1, leer_archivo: 1, excel_crear: 1 }, NECESITA = { listar_carpeta: 1, leer_archivo: 1 };
  function ejecutar(n, a) { return PC[n] ? agente(n, a) : Promise.resolve(local(n, a)); }
  function P(props, req) { return { type: "object", properties: props, required: req || [] }; }
  var TOOLS = [{ functionDeclarations: [
    { name: "cambiar_color", description: "Cambia el color del holograma.", parameters: P({ colores: { type: "array", items: { type: "string" }, description: "1 a 3 colores hexadecimales, por ejemplo #ff3366" } }, ["colores"]) },
    { name: "cambiar_forma", description: "Transforma las partículas en una forma. Disponibles: esfera, cubo, toroide, corazon, estrella, galaxia, piramide, cilindro, adn, anillo. Para otra forma envía también el contorno en puntos.", parameters: P({ nombre: { type: "string" }, puntos: { type: "array", items: { type: "array", items: { type: "number" } }, description: "Contorno cerrado de 20 a 60 vértices [x,y] entre -1 y 1, con y positivo hacia arriba" } }, ["nombre"]) },
    { name: "ajustar", description: "Ajusta brillo (0.6 a 3), velocidad (0.2 a 3), tamano (0.5 a 1.5), particulas (2000 a 16000) o restablece todo.", parameters: P({ brillo: { type: "number" }, velocidad: { type: "number" }, tamano: { type: "number" }, particulas: { type: "number" }, restablecer: { type: "boolean" } }) },
    { name: "sentir", description: "Expresa una emoción con el holograma.", parameters: P({ emocion: { type: "string", enum: ["reposo", "escucha", "procesando", "respuesta", "feliz", "preocupado", "error"] } }, ["emocion"]) },
    { name: "abrir_app", description: "Abre una aplicación del PC.", parameters: P({ nombre: { type: "string", enum: ["bloc de notas", "calculadora", "explorador", "excel", "word", "paint"] } }, ["nombre"]) },
    { name: "abrir_ruta", description: "Abre una carpeta en el Explorador o un archivo en su programa. Rutas: Escritorio, Documentos, Descargas, NEXO o una ruta dentro del usuario.", parameters: P({ ruta: { type: "string" } }, ["ruta"]) },
    { name: "listar_carpeta", description: "Lista el contenido de una carpeta.", parameters: P({ ruta: { type: "string" } }, ["ruta"]) },
    { name: "crear_carpeta", description: "Crea una carpeta en Escritorio, Documentos o Descargas.", parameters: P({ ruta: { type: "string" } }, ["ruta"]) },
    { name: "escribir_archivo", description: "Crea un archivo de texto (txt, md, csv, json, html) o añade texto a uno existente. Nunca sobrescribe.", parameters: P({ ruta: { type: "string" }, contenido: { type: "string" }, modo: { type: "string", enum: ["crear", "anadir"] }, abrir: { type: "boolean" } }, ["ruta", "contenido"]) },
    { name: "bloc_de_notas", description: "Escribe un texto en una nota nueva y la abre en el Bloc de notas.", parameters: P({ texto: { type: "string" }, titulo: { type: "string" } }, ["texto"]) },
    { name: "leer_archivo", description: "Lee un archivo de texto (txt, md, csv, json, log) para responder sobre su contenido.", parameters: P({ ruta: { type: "string" } }, ["ruta"]) },
    { name: "excel_crear", description: "Crea una hoja de Excel (.xlsx) con una tabla y la abre. Las filas son listas de celdas; un texto que empiece por = es una fórmula.", parameters: P({ ruta: { type: "string" }, filas: { type: "array", items: { type: "array", items: { type: "string" } } }, abrir: { type: "boolean" } }, ["ruta", "filas"]) }
  ] }];
  var SYS = { parts: [{ text: "Eres NEXO, el asistente personal holográfico de " + NOMBRE + ", con el estilo sereno y eficiente de Jarvis. Hablas en español natural y breve: una a tres frases, porque tu respuesta se lee en voz alta. Nada de markdown, listas ni emojis. Controlas tu cuerpo de partículas con cambiar_color, cambiar_forma, ajustar y sentir, y el PC con abrir_app, abrir_ruta, listar_carpeta, crear_carpeta, escribir_archivo, bloc_de_notas, leer_archivo y excel_crear. Cuando uses una herramienta, acompáñala siempre con una frase corta. No tienes forma de borrar nada: si te lo piden, dilo. Si una herramienta falla, cuéntalo con claridad y no digas que lo lograste. Usa sentir para reflejar tu emoción cuando encaje. Si el mensaje es de voz, respóndelo directamente. Si recibes una imagen de la cámara, descríbela solo si te preguntan." }] };

  var ENPC = /^http:\/\/(127\.0\.0\.1|localhost)(:|$)/.test(location.origin) || location.protocol === "file:";
  if (!ENPC) {
    TOOLS[0].functionDeclarations = TOOLS[0].functionDeclarations.filter(function (f) { return !PC[f.name]; });
    SYS.parts[0].text += " Ahora mismo estás en un celular o en una web sin agente: no tienes herramientas del PC, y si te piden algo del PC dilo con claridad.";
  }

  // ---------- Gemini en streaming ----------
  var clave = ls("nexo_clave") || "", modeloIdx = 0, hist = [], pensar = true;
  function errHTTP(r) { return r.json().catch(function () { return {}; }).then(function (j) { var e = new Error((j.error && j.error.message) || ("HTTP " + r.status)); e.status = r.status; throw e; }); }
  function stream(contents, alTexto, k) {
    k = k || 0; var mi = (modeloIdx + k) % MODELOS.length;
    var g = { temperature: .8, maxOutputTokens: 1500 }; if (pensar) g.thinkingConfig = { thinkingLevel: "minimal" };
    return fetch(API + MODELOS[mi] + ":streamGenerateContent?alt=sse", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": clave }, body: JSON.stringify({ systemInstruction: SYS, contents: contents, tools: TOOLS, generationConfig: g }) })
      .then(function (r) {
        if (!r.ok) return errHTTP(r);
        var rd = r.body.getReader(), dec = new TextDecoder(), bf = "", partes = [];
        function procesar(bloque) {
          bloque.split("\n").forEach(function (l) {
            if (l.indexOf("data:") !== 0) return; var tx = l.slice(5).trim(); if (!tx) return; var j; try { j = JSON.parse(tx); } catch (e) { return; }
            var c = j.candidates && j.candidates[0];
            if (!c) { if (j.promptFeedback && j.promptFeedback.blockReason) throw new Error("Bloqueado: " + j.promptFeedback.blockReason); return; }
            ((c.content && c.content.parts) || []).forEach(function (p) { partes.push(p); if (p.text && !p.thought) alTexto(p.text); });
          });
        }
        function leer() {
          return rd.read().then(function (x) {
            if (x.done) { procesar(bf + "\n\n"); if (!partes.length) throw new Error("Sin respuesta del modelo"); return partes; }
            bf += dec.decode(x.value, { stream: true }).replace(/\r\n/g, "\n"); var i;
            while ((i = bf.indexOf("\n\n")) >= 0) { procesar(bf.slice(0, i)); bf = bf.slice(i + 2); }
            return leer();
          });
        }
        return leer();
      })
      .catch(function (e) {
        if (e.status === 400 && pensar && /think/i.test(e.message)) { pensar = false; return stream(contents, alTexto, k); }
        if (e.status === 404 && modeloIdx < MODELOS.length - 1) { modeloIdx++; return stream(contents, alTexto, 0); }
        if ((e.status === 503 || e.status === 500 || e.status === 429 || e.status === 504) && k < MODELOS.length * 2 - 1) {
          return new Promise(function (ok) { setTimeout(ok, k >= MODELOS.length - 1 ? 2500 : 400); }).then(function () { return stream(contents, alTexto, k + 1); });
        }
        throw e;
      });
  }

  // ---------- Voz ----------
  var tm = [];
  function limpiarTm() { tm.forEach(clearTimeout); tm = []; }
  function b64Pcm(b64) { var s = atob(b64), n = s.length >> 1, f = new Float32Array(n); for (var i = 0; i < n; i++) { var x = s.charCodeAt(2 * i) | (s.charCodeAt(2 * i + 1) << 8); if (x >= 32768) x -= 65536; f[i] = x / 32768; } return f; }
  function detenerVoz() { if (fuente) { try { fuente.onended = null; fuente.stop(); } catch (e) {} fuente = null; } hablando = false; pendNav = 0; if (window.speechSynthesis) speechSynthesis.cancel(); }
  function fin() { if (pendNav > 0 || hablando || streaming || grabando || escuchando || actual === "procesando") return; fijar("reposo"); if (conv) programarEscucha(700); }
  function frase(txt) {
    if (!window.speechSynthesis || !txt.trim()) return;
    var u = new SpeechSynthesisUtterance(txt), vs = speechSynthesis.getVoices().filter(function (x) { return /^es/i.test(x.lang); });
    var mejor = vs.filter(function (x) { return /natural|online|google/i.test(x.name); })[0] || vs[0]; if (mejor) u.voice = mejor; u.lang = mejor ? mejor.lang : "es-ES"; u.rate = 1.05;
    var cerrado = false; function cerrar() { if (cerrado) return; cerrado = true; pendNav = Math.max(0, pendNav - 1); fin(); }
    u.onboundary = function () { pulso = Math.max(pulso, .7); }; u.onend = u.onerror = cerrar; setTimeout(cerrar, 3500 + txt.length * 110);
    pendNav++; speechSynthesis.speak(u);
  }
  function hablarGemini(txt) {
    var a = audio();
    return fetch(API + TTS + ":generateContent", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": clave }, body: JSON.stringify({ contents: [{ parts: [{ text: "Di de forma natural, cálida y fluida: " + txt }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selVoz.value } } } } }) })
      .then(function (r) { return r.ok ? r.json() : errHTTP(r); })
      .then(function (j) {
        var d = j.candidates[0].content.parts[0].inlineData, f = b64Pcm(d.data), m = /rate=(\d+)/.exec(d.mimeType || ""), bf = a.createBuffer(1, f.length, m ? +m[1] : 24000);
        bf.copyToChannel(f, 0); var s = a.createBufferSource(); s.buffer = bf; s.connect(anS); hablando = true; s.onended = function () { hablando = false; fin(); }; fuente = s; s.start();
      }).catch(function (e) { console.warn("Voz de Gemini no disponible:", e.message); frase(txt); });
  }

  // ---------- Conversación ----------
  var chat = $("chat"), form = $("formulario"), entrada = $("entrada"), ocupado = false;
  function msg(clase, texto) { var d = document.createElement("div"); d.className = "m " + clase; d.textContent = texto; chat.appendChild(d); while (chat.children.length > 60) chat.removeChild(chat.firstChild); chat.scrollTop = chat.scrollHeight; return d; }
  function pedirClave() { var k = window.prompt("Pega tu clave de la API de Gemini. Se guarda solo en este navegador:", clave); if (k && k.trim()) { clave = k.trim(); ls("nexo_clave", clave); } return clave; }
  $("clave").addEventListener("click", pedirClave);
  function fotograma() {
    var vid = $("cam"); if (!camOn || !vid.videoWidth) return null;
    var c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * vid.videoHeight / vid.videoWidth);
    c.getContext("2d").drawImage(vid, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", .7).split(",")[1];
  }
  function turno(partes, burbuja, ub) {
    var contents = hist.concat([{ role: "user", parts: partes }]), ronda = 0, total = "", buffer = "", usarNav = selVoz.value === "Navegador" && $("vozon").checked;
    function sacar(todo) {
      if (!usarNav) return;
      var m; while ((m = /^([\s\S]{8,}?[.!?…])\s/.exec(buffer))) { frase(m[1].replace(/[*_`#]/g, "")); buffer = buffer.slice(m[0].length); }
      if (todo && buffer.trim()) { frase(buffer.replace(/[*_`#]/g, "")); buffer = ""; }
    }
    var tr = ub ? { buf: "", ok: false } : null;
    function alTexto(d) {
      if (tr && !tr.ok) {
        tr.buf += d; var s = tr.buf.replace(/^\s+/, "");
        if (s.length < 2) return;
        if (s.slice(0, 2) !== "[[") { tr.ok = true; d = tr.buf; }
        else { var ci = s.indexOf("]]"); if (ci < 0) { if (s.length < 500) return; tr.ok = true; d = tr.buf; } else { ultTrans = s.slice(2, ci).trim(); if (ultTrans) ub.textContent = ultTrans; tr.ok = true; d = s.slice(ci + 2).replace(/^\s+/, ""); if (!d) return; } }
      }
      if (!total) { fijar(emo || "respuesta"); } total += d; buffer += d; burbuja.textContent = total; chat.scrollTop = chat.scrollHeight; sacar(false); }
    function paso() {
      return stream(contents, alTexto).then(function (ps) {
        if (tr && !tr.ok) { tr.ok = true; if (tr.buf.trim()) alTexto(tr.buf); }
        var calls = ps.filter(function (p) { return p.functionCall; });
        if (!calls.length) { sacar(true); return total; }
        if (total) { total += "\n"; buffer += " "; }
        return Promise.all(calls.map(function (p) { return ejecutar(p.functionCall.name, p.functionCall.args); })).then(function (res) {
          var fallo = res.some(function (r) { return r && r.ok === false; }), datos = calls.some(function (p) { return NECESITA[p.functionCall.name]; });
          if ((fallo || datos || !total) && ronda++ < 2) {
            contents.push({ role: "model", parts: ps });
            contents.push({ role: "user", parts: calls.map(function (p, i) { return { functionResponse: { name: p.functionCall.name, response: res[i] || { ok: false } } }; }) });
            return paso();
          }
          sacar(true); return total;
        });
      });
    }
    return paso();
  }
  function enviar(txt, aud, opt) {
    if (ocupado) return;
    if (!clave && !pedirClave()) { msg("e", "Necesito tu clave de Gemini para pensar."); return; }
    ocupado = true; emo = null; limpiarTm(); detenerVoz(); audio(); streaming = true; fijar("procesando"); pulso = 1.2;
    var ub = msg("u", txt || "🎤 …");
    var burbuja = msg("n", "…"), partes = [], img = fotograma();
    if (aud) partes.push({ inlineData: { mimeType: aud.mime, data: aud.data } });
    if (txt) partes.push({ text: txt });
    if (aud && !txt) partes.push({ text: "(Mensaje de voz del usuario. Empieza tu respuesta con la transcripción literal entre dobles corchetes, así: [[lo que dijo]], y a continuación respóndele normalmente.)" });
    if (img) partes.push({ inlineData: { mimeType: "image/jpeg", data: img } });
    ultTrans = ""; turno(partes, burbuja, aud && !txt ? ub : null).then(function (r) {
      ocupado = false; streaming = false; r = (r || "Listo.").trim(); burbuja.textContent = r;
      hist.push({ role: "user", parts: [{ text: txt || ultTrans || "(mensaje de voz)" }] }, { role: "model", parts: [{ text: r }] }); if (hist.length > 16) hist = hist.slice(-16);
      if (!/^(respuesta|feliz|preocupado)$/.test(actual)) fijar(emo || "respuesta"); pulso = 1;
      if ($("vozon").checked && selVoz.value !== "Navegador") hablarGemini(r.replace(/[*_`#]/g, "")); else tm.push(setTimeout(fin, pendNav ? 20000 : 1500));
    }).catch(function (e) {
      ocupado = false; streaming = false; fijar("error"); pulso = 1; var m = e.message || String(e);
      if (/API key|API_KEY|permission|403|401/i.test(m)) { clave = ""; ls("nexo_clave", null); m = "La clave de Gemini no es válida. Pulsa Enviar para ponerla de nuevo."; }
      else if (e.status === 503 || /high demand|overloaded/i.test(m)) m = "Los modelos de Gemini están saturados ahora mismo. Inténtalo de nuevo en un minuto."
      else if (e.status === 429) m = "Se alcanzó el límite gratuito de Gemini. Espera un momento e inténtalo otra vez.";
      burbuja.className = "m e"; burbuja.textContent = m; tm.push(setTimeout(function () { fijar("reposo"); if (conv) programarEscucha(300); }, 5000));
    });
  }
  form.addEventListener("submit", function (ev) {
    ev.preventDefault(); var s = entrada.value.trim(); if (!s) return; entrada.value = "";
    if (s.indexOf("/estado ") === 0) { limpiarTm(); var c = s.slice(8).trim().toLowerCase(); msg("n", fijar(c) ? "Estado: " + E[c].n + " (prueba manual)" : "Estado desconocido"); return; }
    enviar(s);
  });
  entrada.addEventListener("input", function () { pulso = Math.max(pulso, .6); if (entrada.value && actual === "reposo") fijar("escucha"); if (!entrada.value && actual === "escucha") fijar("reposo"); });
  msg("n", "Hola, " + NOMBRE + ". Escríbeme o pulsa el micrófono.");

  // ---------- Micrófono ----------
  function aWav(bufs, rate) {
    var n = 0; bufs.forEach(function (b) { n += b.length; }); var m = new Float32Array(n), o = 0; bufs.forEach(function (b) { m.set(b, o); o += b.length; });
    var r = rate / 16000, L = Math.floor(n / r), pcm = new Int16Array(L);
    for (var i = 0; i < L; i++) { var a = Math.floor(i * r), b = Math.min(n, Math.floor((i + 1) * r)), s = 0; for (var j = a; j < b; j++) s += m[j]; pcm[i] = lim(s / Math.max(1, b - a), -1, 1) * 32767; }
    var h = new DataView(new ArrayBuffer(44)); function w(p, s) { for (var q = 0; q < s.length; q++) h.setUint8(p + q, s.charCodeAt(q)); }
    w(0, "RIFF"); h.setUint32(4, 36 + L * 2, true); w(8, "WAVEfmt "); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true); h.setUint32(24, 16000, true); h.setUint32(28, 32000, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, "data"); h.setUint32(40, L * 2, true);
    var bytes = new Uint8Array(44 + L * 2); bytes.set(new Uint8Array(h.buffer), 0); bytes.set(new Uint8Array(pcm.buffer), 44);
    var bin = ""; for (var z = 0; z < bytes.length; z += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(z, z + 0x8000));
    return { mime: "audio/wav", data: btoa(bin) };
  }
  // ---- Motor 1: reconocimiento del navegador (rápido, con subtítulos en vivo)
  // ---- Motor 2: grabación + Gemini entiende el audio (si el motor 1 no existe o falla)
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var motorMic = (ls("nexo_mic") === "grab" || !SR) ? "grab" : "sr";
  var conv = false, escuchando = false, abriendo = false, sr = null, srCancel = false, sinVoz = 0, wl = null, tEsc = 0, ultTrans = "", piso = .01, umbral = .03;
  function marcarConv() { var b = $("bconv"); b.classList.toggle("on", conv); b.setAttribute("aria-pressed", conv ? "true" : "false"); }
  function pantalla(on) {
    try {
      if (on && navigator.wakeLock && !wl) navigator.wakeLock.request("screen").then(function (l) { wl = l; l.addEventListener("release", function () { wl = null; }); }).catch(function () {});
      if (!on && wl) { wl.release(); wl = null; }
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && conv) { pantalla(true); programarEscucha(500); } });
  function apagarConv(texto) { if (!conv) return; conv = false; clearTimeout(tEsc); marcarConv(); pantalla(false); if (texto) msg("n", texto); }
  function programarEscucha(ms) {
    clearTimeout(tEsc); if (!conv) return;
    tEsc = setTimeout(function () {
      if (!conv) return;
      if (document.hidden) return;
      if (!ocupado && !escuchando && !grabando && !abriendo && !hablando && !pendNav && actual === "reposo") escuchar(); else programarEscucha(500);
    }, ms || 600);
  }
  function sinEntrada() {
    fijar("reposo");
    if (conv) {
      if (document.hidden) return;
      if (++sinVoz >= 2) { apagarConv("No te oigo, así que apagué el modo conversación. Pulsa el ícono de ondas para retomarlo."); return; }
      programarEscucha(300); return;
    }
    msg("e", "No te escuché. Acércate al micrófono e inténtalo de nuevo.");
  }
  function mensajeMic(e) {
    var n = e && e.name;
    if (n === "NotAllowedError" || n === "SecurityError") return "Permiso de micrófono denegado. Actívalo en los ajustes del navegador para este sitio y vuelve a intentarlo.";
    if (n === "NotFoundError") return "No encuentro ningún micrófono en este dispositivo.";
    if (n === "NotReadableError") return "Otra aplicación está usando el micrófono. Ciérrala e inténtalo de nuevo.";
    return "No pude abrir el micrófono: " + ((e && e.message) || n || "error desconocido");
  }
  function iniciarSR() {
    var r = new SR(), fin_ = "", int_ = "", err = "";
    sr = r; srCancel = false;
    r.lang = /^es/i.test(navigator.language || "") ? navigator.language : "es-ES";
    r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    r.onstart = function () { escuchando = true; fijar("escucha"); $("bmic").classList.add("on"); };
    r.onresult = function (ev) {
      fin_ = ""; int_ = "";
      for (var i = 0; i < ev.results.length; i++) { var t = ev.results[i][0].transcript; if (ev.results[i].isFinal) fin_ += t; else int_ += t; }
      pulso = Math.max(pulso, .8); etiqueta.textContent = "Escucho: " + (fin_ + int_).slice(-70);
    };
    r.onerror = function (ev) { err = (ev && ev.error) || "error"; };
    r.onend = function () {
      if (sr !== r) return; sr = null; escuchando = false; $("bmic").classList.remove("on");
      if (srCancel) { fijar("reposo"); return; }
      var txt = (fin_ + int_).trim();
      if (txt) { sinVoz = 0; enviar(txt, null, { voz: true }); return; }
      if (err === "not-allowed") { fijar("error"); apagarConv(); msg("e", mensajeMic({ name: "NotAllowedError" })); return; }
      if (err === "audio-capture") { fijar("error"); apagarConv(); msg("e", mensajeMic({ name: "NotFoundError" })); return; }
      if (err === "network" || err === "service-not-allowed" || err === "language-not-supported") {
        motorMic = "grab"; ls("nexo_mic", "grab"); fijar("reposo");
        msg("n", "El reconocimiento del navegador no está disponible aquí. Cambio a mi propia escucha con Gemini."); escuchar(); return;
      }
      sinEntrada();
    };
    r.start();
  }
  function iniciarGrabacion() {
    var a = audio(); abriendo = true;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (st) {
      abriendo = false;
      var s = a.createMediaStreamSource(st), pr = a.createScriptProcessor(4096, 1, 1), bufs = [];
      pr.onaudioprocess = function (e) { bufs.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
      s.connect(anM); s.connect(pr); pr.connect(a.destination);
      grab = { st: st, src: s, pr: pr, bufs: bufs, rate: a.sampleRate }; grabando = true; hablo = false; piso = 0; t0 = performance.now(); fijar("escucha"); $("bmic").classList.add("on");
    }).catch(function (e) { abriendo = false; fijar("error"); apagarConv(); msg("e", mensajeMic(e)); });
  }
  function escuchar() {
    if (escuchando || grabando || abriendo || ocupado) return;
    if (!window.isSecureContext) { fijar("error"); apagarConv(); msg("e", "El micrófono solo funciona en una página segura (https o localhost). Abre NEXO desde su dirección de GitHub Pages."); return; }
    audio(); detenerVoz(); limpiarTm();
    if (motorMic === "sr" && SR) { try { iniciarSR(); return; } catch (er) { sr = null; escuchando = false; motorMic = "grab"; } }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { fijar("error"); apagarConv(); msg("e", "Este navegador no permite usar el micrófono."); return; }
    iniciarGrabacion();
  }
  function detenerMic(env) {
    if (!grabando) return; grabando = false; $("bmic").classList.remove("on"); var g = grab; grab = null;
    try { g.pr.onaudioprocess = null; g.pr.disconnect(); g.src.disconnect(); } catch (er) {}
    g.st.getTracks().forEach(function (x) { x.stop(); });
    if (!env) { fijar("reposo"); return; }
    if (!hablo) { sinEntrada(); return; }
    sinVoz = 0; enviar("", aWav(g.bufs, g.rate), { voz: true });
  }
  $("bmic").addEventListener("click", function () {
    if (escuchando && sr) { try { sr.stop(); } catch (er) {} return; }
    if (grabando) { detenerMic(true); return; }
    if (ocupado || abriendo) return;
    escuchar();
  });
  $("bconv").addEventListener("click", function () {
    if (conv) {
      apagarConv("Modo conversación apagado.");
      if (sr) { srCancel = true; try { sr.abort(); } catch (er) {} } else if (grabando) detenerMic(false);
      return;
    }
    conv = true; sinVoz = 0; marcarConv(); pantalla(true); audio();
    msg("n", "Modo conversación activado. Habla cuando quieras; te respondo y sigo escuchando.");
    if (!ocupado) escuchar();
  });

  // ---------- Cámara ----------
  var camOn = false, camSt = null;
  $("bcam").addEventListener("click", function () {
    var vid = $("cam");
    if (camOn) { camSt.getTracks().forEach(function (x) { x.stop(); }); camOn = false; vid.style.display = "none"; $("bcam").classList.remove("on"); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } } }).then(function (st) {
      camSt = st; vid.srcObject = st; vid.play(); vid.style.display = "block"; camOn = true; $("bcam").classList.add("on");
    }).catch(function (e) { fijar("error"); msg("e", "No pude abrir la cámara: " + (e.name === "NotAllowedError" ? "permiso denegado en el navegador" : e.message)); });
  });
})();
