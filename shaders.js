const vs = `#version 300 es
in vec4 position;

void main() {
    gl_Position = position;
}
`;

const fs = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 u_resolution;
uniform float u_time;

vec3 rotateX(vec3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(
        p.x,
        c * p.y - s * p.z,
        s * p.y + c * p.z
    );
}
vec3 rotateY(vec3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(
        c * p.x + s * p.z,
        p.y,
        -s * p.x + c * p.z
    );
}
vec3 rotateZ(vec3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(
        c * p.x - s * p.y,
        s * p.x + c * p.y,
        p.z
    );
}

//SDF and junction functions from: https://iquilezles.org/articles/distfunctions/
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdPlane( vec3 p)
{
    float frequency = 1.5; // Controla a frequência das ondulações
    float amplitude = 0.1; // Controla a altura da variação

    // Cria um deslocamento suave baseado na posição XZ
    float heightOffset = sin(p.x * frequency) * cos(p.z * frequency) * amplitude;

    return p.y - heightOffset; // Define a altura do plano com variação
}

float opSmoothUnion( float d1, float d2, float k )
{
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

float sdTorusWithBlocks(vec3 p, vec2 sc, float ra, float rb, float blockSize, int numBlocks) {
    
    float angleStep = 6.283185307 / float(numBlocks); // 2π / número de blocos
    
    //float minDist = torusDist;
    float minDist = 1000.0;
    for (int i = 0; i < numBlocks; i++) {
        // Ângulos para posicionamento no toro
        float phi = angleStep * float(i) + u_time*.4; // Ângulo ao redor do buraco (maior raio)
        float theta = 0.0; // Ângulo ao redor do tubo (menor raio)
        
        // Posição do bloco na superfície do toro
        vec3 blockPos = vec3(
            (ra + rb * cos(theta)) * cos(phi) , // Cálculo correto do X
            (ra + rb * cos(theta)) * sin(phi), // Cálculo correto do Y
            rb * sin(theta)                      // Cálculo do Z
        );
        
        // Vetores tangentes para orientação do bloco
        vec3 tangentPhi = vec3(
            -(ra + rb * cos(theta)) * sin(phi),
            (ra + rb * cos(theta)) * cos(phi),
            0.0
        );
        
        vec3 tangentTheta = vec3(
            -rb * sin(theta) * cos(phi),
            -rb * sin(theta) * sin(phi),
            rb * cos(theta)
        );
        
        vec3 normal = normalize(cross(tangentTheta, tangentPhi)); // Normal da superfície
        
        // Matriz de rotação para alinhar o bloco
        mat3 rot = mat3(
            normalize(tangentPhi ),
            normalize(tangentTheta),
            normal 
        );
        
        // Transformação do ponto para o espaço local do bloco
        vec3 q = (p - blockPos) * rot ;
        
        // Distância do bloco (ex: cubo)
        float blockDist = sdBox(rotateZ(q, u_time*0.4), vec3(.5, 0.6, 0.7));
        
        // União suavizada (opcional)
        minDist = opSmoothUnion(blockDist, minDist , 0.3);
    }
    
    return minDist;
}

float sdfQuad(vec3 p, vec3 a, vec3 b, vec3 c, vec3 d) {
    vec3 ba = b - a, pa = p - a;
    vec3 cb = c - b, pb = p - b;
    vec3 dc = d - c, pc = p - c;
    vec3 ad = a - d, pd = p - d;
    vec3 nor = cross(ba, ad);
    
    float inside = sign(dot(cross(ba, nor), pa)) +
                   sign(dot(cross(cb, nor), pb)) +
                   sign(dot(cross(dc, nor), pc)) +
                   sign(dot(cross(ad, nor), pd));
    
    if (inside < 3.0) {
        return sqrt(min(
            min(
                min(
                    dot(ba * clamp(dot(ba, pa) / dot(ba, ba), 0.0, 1.0) - pa, 
                        ba * clamp(dot(ba, pa) / dot(ba, ba), 0.0, 1.0) - pa),
                    dot(cb * clamp(dot(cb, pb) / dot(cb, cb), 0.0, 1.0) - pb, 
                        cb * clamp(dot(cb, pb) / dot(cb, cb), 0.0, 1.0) - pb)
                ),
                dot(dc * clamp(dot(dc, pc) / dot(dc, dc), 0.0, 1.0) - pc, 
                    dc * clamp(dot(dc, pc) / dot(dc, dc), 0.0, 1.0) - pc)
            ),
            dot(ad * clamp(dot(ad, pd) / dot(ad, ad), 0.0, 1.0) - pd, 
                ad * clamp(dot(ad, pd) / dot(ad, ad), 0.0, 1.0) - pd)
        ));
    } else {
        return dot(nor, pa) * dot(nor, pa) / dot(nor, nor);
    }
}

float createCristal(vec3 p) {
    vec3 v1 = vec3(0.0, 0.3 - 0.3, 1.0);
    vec3 v2 = vec3(0.8, 0.4 - 0.3, 1.0);
    vec3 v3 = vec3(1.1, 1.3 / 2.0 - 0.3, 1.0);
    vec3 v4 = vec3(0.2, 0.5 - 0.3, 1.0);

    vec3 v5 = vec3(0.0, 0.3 - 0.3, 1.0);
    vec3 v6 = vec3(-0.8, 0.4 - 0.3, 1.0);
    vec3 v7 = vec3(-1.1, 1.3 / 2.0 - 0.3, 1.0);
    vec3 v8 = vec3(-0.2, 0.5 - 0.3, 1.0);

    vec3 v9  = vec3(0.0, 0.3 - 0.3, 1.0);
    vec3 v10 = vec3(0.15, 1.6 / 2.0 - 0.3, 1.0);
    vec3 v11 = vec3(0.0, 1.5 - 0.3, 1.0);
    vec3 v12 = vec3(-0.15, 1.3 / 2.0 - 0.3, 1.0);

    //const float offsetX[7] = float[7](-6.5, 0.7, 5.0, -4.0, 5.0, -5.0, 4.0);
    //const float offsetZ[7] = float[7](-2.4, -7.6, -1.6, 0.0, 0.8, 2.4, 3.8);
//
    //float d = 1000.0;
//
    //for (int x = 0; x < 7; x++) {
    const float offsetX[4] = float[4](-6.5, 0.7, 5.0, -4.0);
    const float offsetZ[4] = float[4](-2.4, -7.6, -1.6, 0.0);

    float d = 1000.0;

    for (int x = 0; x < 4; x++) {
        float scale = .5; // Garantir que a escala seja positiva

        vec3 a = vec3(offsetX[x], 0.0, offsetZ[x]);
        vec3 pos = p - a;
        vec3 q = pos * scale; // Escalar após a translação

        // Escalar os vértices corretamente
        vec3 v1s = v1 * scale;
        vec3 v2s = v2 * scale;
        vec3 v3s = v3 * scale;
        vec3 v4s = v4 * scale;

        vec3 v5s = v5 * scale;
        vec3 v6s = v6 * scale;
        vec3 v7s = v7 * scale;
        vec3 v8s = v8 * scale;

        vec3 v9s  = v9 * scale;
        vec3 v10s = v10 * scale;
        vec3 v11s = v11 * scale;
        vec3 v12s = v12 * scale;

        //d = min(d, sdfQuad(q, v1s, v2s, v3s, v4s));
        //d = min(d, sdfQuad(q, v5s, v6s, v7s, v8s));
        //d = min(d, sdfQuad(q, v9s, v10s, v11s, v12s));

        float smoothCristal = opSmoothUnion(sdfQuad(q, v5s, v6s, v7s, v8s), sdfQuad(q, v1s, v2s, v3s, v4s), 0.1);
        smoothCristal = opSmoothUnion(smoothCristal, sdfQuad(q, v9s, v10s, v11s, v12s) , 0.1);
        d = min(d,smoothCristal);
    }

    return d;
}

// SDF combinada da cena
// Função de SDF da cena modificada para retornar um índice e a distância
vec2 sceneSDF(vec3 p) {
    float step0 = sdBox(p - vec3(0, 0.2, 1.0), vec3(1.8, 0.2, 0.8)); 
    float step1 = sdBox(p - vec3(0, 0.6, .6), vec3(1.4, 0.2, 0.8));
    float escada = opSmoothUnion(step0, step1, 0.4);

    float portal = sdTorusWithBlocks(vec3(p.x, p.y-1.3, p.z-0.5), vec2(sin(90.0), cos(90.0)), 2.0, 0.3, .5, 10);
    float cristal = createCristal(p);

    float plane = sdPlane(p);  

    float escadaPlane = opSmoothUnion(plane, escada, .1);
    float dist = min(escadaPlane, min(portal, cristal));
    if (dist == escada) {
        return vec2(0.0, dist); // Índice 0 para escada
    } else if (dist == portal) {
        return vec2(1.0, dist); // Índice 1 para portal
    } else if (dist == cristal) {
        return vec2(2.0, dist); // Índice 2 para cristal
    } else {
        return vec2(3.0, dist); // Índice 3 para plano
    }
}
// Cálculo da normal
vec3 calcNormal(vec3 p) {
    vec2 eps = vec2(0.001, 0.0);
  return normalize(vec3(
    sceneSDF(p + eps.xyy).y - sceneSDF(p - eps.xyy).y,
    sceneSDF(p + eps.yxy).y - sceneSDF(p - eps.yxy).y,
    sceneSDF(p + eps.yyx).y - sceneSDF(p - eps.yyx).y
  ));
}

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    for(float t = mint; t < maxt;) {
        float h = sceneSDF(ro + rd * t).y;
        if(h < 0.001) return 0.0;
        res = min(res, k * h / t);
        t += h;
    }
    return res;
}

vec3 emittedLight(vec3 p, vec3 normal, vec3 lightPos, vec3 lightColor, float intensity) {
    vec3 lightDir = normalize(lightPos - p); // Direção da luz emitida pelo objeto
    float dist = length(lightPos - p); // Distância do ponto até a luz
    float attenuation = 1.0 / (1.0 + 0.01 * dist); // Atenuação quadrática
    
    float diffuse = max(dot(normal, lightDir), 0.0) * attenuation * intensity; 
    return diffuse * lightColor;
}

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float fbm(vec2 p) {
    float value = 0.0;
    float scale = 0.5;
    for(int i = 0; i < 4; i++) {
        value += scale * noise(p);
        p *= 2.0;
        scale *= 0.5;
    }
    return value;
}

vec3 galaxyBackground(vec2 uv) {
    uv *= vec2(1.5, 6.5);
    uv -= vec2(0.0, .7);
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    float spiral = mod(angle + radius * 6.0, 6.28) - 3.14;

    float intensity = exp(-radius * 2.0) * smoothstep(0.1, 0.05, abs(spiral));
    vec3 color = mix(vec3(0.1, 0.0, 0.2), vec3(0.6, 0.2, 1.0), intensity);

    float nebula = fbm(uv * 3.0) * 0.5;
    color += vec3(0.4, 0.1, 0.6) * nebula;

    return color;
}
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
            
    // Configuração da câmera
    vec3 ro = rotateY(vec3(1.0, 2.0, 10.0), radians(-u_time*2.2));
    vec3 rd = normalize(vec3(uv, -1.0));

    // Ray marching
    float t = 0.0;
    vec3 p;
    float objInd = 0.0;

    for(int i = 0; i < 100; i++) {
        p = ro + rd * t;
        vec2 distAndIndex = sceneSDF(p);
        float d = distAndIndex.y;
        objInd = distAndIndex.x;
        if(d < 0.001 || t > 20.0) break;
        t += d;
    }
    if(t < 20.0) {

        // Iluminação - Múltiplas luzes
        vec3 lightDir1 = (vec3(1.0, 4.0, 2.0));  // Luz principal (de cima)
        vec3 lightColor1 = vec3(1.0, 0.9, 0.8); // Luz principal amarelada

        vec3 normal = calcNormal(p);

        vec3 cristalLightColor = vec3(0.5, 0.1, 0.99);
        vec3 cristalEmission = vec3(0.0);
        const float offsetX[4] = float[4](-6.5, 0.7, 5.0, -4.0);
        const float offsetZ[4] = float[4](-2.4, -7.6, -1.6, 0.0);
        for(int n = 0; n < 4; n +=1){
            cristalEmission += emittedLight(p, normal, vec3(-.5+offsetX[n], 0.2, offsetZ[n]), cristalLightColor, 20.0);
        }
    

        // Sombras e iluminação difusa para cada luz
        float shadow1 = softShadow(p + normal * 0.02, lightDir1, 0.02, 10.0, 8.0);

        float attenuation = 0.1;
        float diff1 = max(dot(normal, lightDir1), 0.0) * shadow1 * attenuation ;


        vec3 diff = (diff1 * lightColor1)+cristalEmission;
        diff = diff / (1.0 + diff);

        
        // Componentes da cor
        vec3 color = vec3(0.0);

        if(objInd == 0.0) { // Escada
            color = vec3(0.8, 0.5, 0.3) * (diff + 0.2); // Cor da escada
        } 
        else if(objInd == 1.0) { // Portal
            color = vec3(0.5, 0.5, .5) * (diff + 0.2); // Cor do portal
        }
        else if(objInd == 2.0) { // Cristal
            color = vec3(0.5, 0.1, 0.99) * (diff + 0.2);
        } 
        else if(objInd == 3.0) { // Plano
            color = vec3(0.9, 0.9, 0.9) * (diff + 0.2); // Cor do plano
        }
        outColor = vec4(color, 1.0);    

        
    } else {
        vec3 galaxy = galaxyBackground(uv);
        outColor = vec4(galaxy, 1.0);
        
    }
}
`;