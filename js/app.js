import * as THREE from "three"
import fragment from "./shader/fragment.glsl"
import vertex from "./shader/vertex.glsl"
import gsap from "gsap"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import gui from "lil-gui"
import normalizeWheel from "normalize-wheel"

let ww = window.innerWidth
let wh = window.innerHeight

const isFirefox = navigator.userAgent.indexOf("Firefox") > -1
const isWindows = navigator.appVersion.indexOf("Win") != -1

const mouseMultiplier = 0.6
const firefoxMultiplier = 20

const multipliers = {
  mouse: isWindows ? mouseMultiplier * 2 : mouseMultiplier,
  firefox: isWindows ? firefoxMultiplier * 2 : firefoxMultiplier,
}

/** CORE **/
class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene()
    this.container = options.dom
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.tx = 0
    this.ty = 0
    this.cx = 0
    this.cy = 0

    this.diff = 0

    this.wheel = { x: 0, y: 0 }
    this.on = { x: 0, y: 0 }
    this.max = { x: 0, y: 0 }

    this.isDragging = false

    this.tl = gsap.timeline({ paused: true })

    this.el = document.querySelector(".js-grid")

    // Camera

    this.frustumSize = this.width
    this.aspect = this.width / this.height

    this.camera = new THREE.OrthographicCamera(
      (this.frustumSize * this.aspect) / -2,
      (this.frustumSize * this.aspect) / 2,
      this.frustumSize / 2,
      this.frustumSize / -2,
      -1000,
      1000
    )

    this.camera.position.set(0, 0, 2)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0x000000, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.textureLoader = new THREE.TextureLoader()

    document.body.appendChild(this.renderer.domElement)
    /** Gl specifics end **/

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)

    this.addPlanes()
    this.addEvents()
    this.settings()
    this.resize()
  }

  settings() {
    this.settings = {
      marginWidth: 0,
      marginHeight: 0,
      cameraFrustum: this.width,
      OrbitControls: false,
    }

    this.gui = new gui()

    this.gui
      .add(this.settings, "cameraFrustum", this.width / 2, this.width * 2, 10)
      .onChange(() => {
        let frustumSize = this.settings.cameraFrustum
        let aspect = this.width / this.height
        this.camera.left = (frustumSize * aspect) / -2
        this.camera.right = (frustumSize * aspect) / 2
        this.camera.top = frustumSize / 2
        this.camera.bottom = frustumSize / -2
        this.camera.updateProjectionMatrix()
      })
  }

  addEvents() {
    gsap.ticker.add(this.tick)

    window.addEventListener("mousemove", this.onMouseMove)
    window.addEventListener("mousedown", this.onMouseDown)
    window.addEventListener("mouseup", this.onMouseUp)
    window.addEventListener("wheel", this.onWheel)
  }

  addPlanes() {
    const planes = [...document.querySelectorAll(".js-plane")]

    this.planes = planes.map((el, i) => {
      const plane = new Plane()

      plane.init(el, i)

      this.scene.add(plane)

      return plane
    })
  }

  tick = () => {
    const xDiff = this.tx - this.cx
    const yDiff = this.ty - this.cy

    this.cx += xDiff * 0.085
    this.cx = Math.round(this.cx * 100) / 100

    this.cy += yDiff * 0.085
    this.cy = Math.round(this.cy * 100) / 100

    this.diff = Math.max(Math.abs(yDiff * 0.0001), Math.abs(xDiff * 0.0001))

    this.planes.length &&
      this.planes.forEach((plane) =>
        plane.update(this.cx, this.cy, this.max, this.diff)
      )

    this.renderer.render(this.scene, this.camera)
  }

  onMouseMove = ({ clientX, clientY }) => {
    if (!this.isDragging) return

    this.tx = this.on.x + clientX * 2.5
    this.ty = this.on.y - clientY * 2.5
  }

  onMouseDown = ({ clientX, clientY }) => {
    if (this.isDragging) return

    this.isDragging = true

    this.on.x = this.tx - clientX * 2.5
    this.on.y = this.ty + clientY * 2.5
  }

  onMouseUp = ({ clientX, clientY }) => {
    if (!this.isDragging) return

    this.isDragging = false
  }

  onWheel = (e) => {
    let normalized = normalizeWheel(e)

    // console.log(normalized)

    // this.tx -= normalized.pixelX * this.wheel.x
    // this.ty += normalized.pixelY * this.wheel.y

    const { mouse, firefox } = multipliers

    this.wheel.x = e.wheelDeltaX || e.deltaX * -1
    this.wheel.y = e.wheelDeltaY || e.deltaY * -1

    if (isFirefox && e.deltaMode === 1) {
      this.wheel.x *= firefox
      this.wheel.y *= firefox
    }

    this.wheel.y *= mouse
    this.wheel.x *= mouse

    this.tx += this.wheel.x
    this.ty -= this.wheel.y
  }

  resize = () => {
    ww = window.innerHeight
    wh = window.innerWidth

    const { bottom, right } = this.el.getBoundingClientRect()

    this.max.x = right
    this.max.y = bottom
  }
}

const loader = new THREE.TextureLoader()

const geometry = new THREE.PlaneGeometry(1, 1, 1, 1)
const material = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: {
    uTexture: { value: null },
    uResolution: { value: new THREE.Vector2(0.6, 0.9) },
    uSize: { value: new THREE.Vector2(1, 1) },
    uDiff: { value: 0 },
  },
  vertexShader: vertex,
  fragmentShader: fragment,
})

class Plane extends THREE.Object3D {
  init(el, i) {
    this.el = el

    this.x = 0
    this.y = 0

    this.my = 1 - (i % 5) * 0.1

    this.geometry = geometry
    this.material = material.clone()

    this.texture = loader.load(this.el.dataset.src, (texture) => {
      texture.minFilter = THREE.LinearFilter
      texture.generateMipmaps = false

      const { naturalWidth, naturalHeight } = texture.image
      const { uSize, uTexture } = this.material.uniforms

      uTexture.value = texture

      uSize.value.x = naturalWidth
      uSize.value.y = naturalHeight
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.add(this.mesh)

    this.resize()
  }

  update = (x, y, max, diff) => {
    const { right, bottom } = this.rect
    const { uDiff } = this.material.uniforms

    this.y =
      gsap.utils.wrap(-(max.y - bottom), bottom, y * this.my) - this.yOffset

    this.x = gsap.utils.wrap(-(max.x - right), right, x) - this.xOffset

    uDiff.value = diff

    this.position.x = this.x
    this.position.y = this.y
  }

  resize() {
    this.rect = this.el.getBoundingClientRect()

    const { left, top, width, height } = this.rect
    const { uResolution, uToRes, uPos, uOffset } = this.material.uniforms

    this.xOffset = left + width / 2 - ww / 2
    this.yOffset = top + height / 2 - wh / 2

    this.position.x = this.xOffset
    this.position.y = this.yOffset

    uResolution.value.x = width
    uResolution.value.y = height

    this.mesh.scale.set(width, height, 1)
  }

  lerp(start, end, amount) {
    return start * (1 - amount) + end * amount
  }
}

new Sketch({
  dom: document.getElementById("container"),
})
