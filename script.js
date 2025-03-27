const gl = document.querySelector("canvas").getContext("webgl2");
const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

const arrays = {
    position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
};
const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
let lastTime = performance.now();
let frameCount = 0;
function render(time) {
    frameCount++;
    let now = performance.now();
    if (now - lastTime >= 1000) { // Atualiza a cada 1 segundo
        console.log(`FPS: ${frameCount}`);
        frameCount = 0;
        lastTime = now;
    }

    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const uniforms = {
        u_time: time * 0.001,
        u_resolution: [gl.canvas.width, gl.canvas.height],
    };

    gl.useProgram(programInfo.program);

    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, bufferInfo);

    requestAnimationFrame(render);
}
requestAnimationFrame(render);
  