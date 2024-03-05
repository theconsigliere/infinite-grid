precision mediump float;
uniform vec2 uResolution;
uniform vec2 uSize;

uniform sampler2D uTexture;

vec2 cover(vec2 screenSize, vec2 imageSize, vec2 uv) {
  float screenRatio = screenSize.x / screenSize.y;
  float imageRatio = imageSize.x / imageSize.y;

  vec2 newSize = screenRatio < imageRatio 
      ? vec2(imageSize.x * (screenSize.y / imageSize.y), screenSize.y)
      : vec2(screenSize.x, imageSize.y * (screenSize.x / imageSize.x));
  vec2 newOffset = (screenRatio < imageRatio 
      ? vec2((newSize.x - screenSize.x) / 2.0, 0.0) 
      : vec2(0.0, (newSize.y - screenSize.y) / 2.0)) / newSize;

  return uv * screenSize / newSize + newOffset;
}

varying vec2 vUv;

void main() {
    vec2 uv = vUv;

    vec2 uvCover = cover(uResolution, uSize, uv);
    vec4 texture = texture2D(uTexture, uvCover);
	
    gl_FragColor = texture;
}