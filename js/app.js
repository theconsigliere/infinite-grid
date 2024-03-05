import * as THREE from "three"
import fragment from "./shader/fragment.glsl"
import vertex from "./shader/vertex.glsl"
import gsap from "gsap"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import gui from "lil-gui"
import normalizeWheel from "normalize-wheel"

const isFirefox = navigator.userAgent.indexOf("Firefox") > -1
const isWindows = navigator.appVersion.indexOf("Win") != -1

const mouseMultiplier = 0.6
const firefoxMultiplier = 20

const multipliers = {
  mouse: isWindows ? mouseMultiplier * 2 : mouseMultiplier,
  firefox: isWindows ? firefoxMultiplier * 2 : firefoxMultiplier,
}

console.log(multipliers)

/** CORE **/
class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene()
    this.container = options.dom
    this.width = window.innerWidth
    this.height = window.innerHeight

    // scene coordinates
    this.tx = 0
    this.ty = 0
    this.cx = 0
    this.cy = 0
    this.diff = 0

    this.on = { x: 0, y: 0 }
    this.max = { x: 0, y: 0 }
    this.isDragging = false
    this.tl = gsap.timeline({ paused: true })

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

    this.time = 0
    this.isPlaying = true

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0x000000, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.textureLoader = new THREE.TextureLoader()

    document.body.appendChild(this.renderer.domElement)
    /** Gl specifics end **/

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)

    // DOM
    this.DOM = {
      grid: (this.el = document.querySelector(".js-grid")),
      planes: [...document.querySelectorAll(".js-plane")],
    }

    this.planesObjects = []

    this.addObjects()
    this.render()
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

  render() {
    if (!this.isPlaying) return

    this.time += 0.05

    let xDiff = this.tx - this.cx
    let yDiff = this.ty - this.cy

    this.cx += xDiff * 0.085
    this.cx = Math.round(this.cx * 100) / 100

    this.cy += yDiff * 0.085
    this.cy = Math.round(this.cy * 100) / 100

    this.diff = Math.max(Math.abs(yDiff * 0.0001), Math.abs(xDiff * 0.0001))

    this.planesObjects.length &&
      this.planesObjects.forEach((plane) => {
        plane.mesh.material.uniforms.uDiff.value = this.diff

        // add all the stuff
        this.x =
          gsap.utils.wrap(
            -(this.max.x - plane.rect.right),
            plane.rect.right,
            this.cx
          ) - plane.xOffset

        this.y =
          gsap.utils.wrap(
            -(this.max.y - plane.rect.bottom),
            plane.rect.bottom,
            this.cy * plane.my
          ) - plane.yOffset

        plane.mesh.position.x = this.x
        plane.mesh.position.y = this.y
      })

    requestAnimationFrame(this.render.bind(this))
    this.renderer.render(this.scene, this.camera)
  }

  addEvents() {
    // gsap.ticker.add(this.tick)
    window.addEventListener("mousemove", this.onMouseMove)
    window.addEventListener("mousedown", this.onMouseDown)
    window.addEventListener("mouseup", this.onMouseUp)
    window.addEventListener("wheel", this.onWheel)
  }

  addObjects() {
    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1)
    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        uTexture: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSize: { value: new THREE.Vector2(1, 1) },
        uDiff: { value: 0 },
      },
      // wireframe: true,
      vertexShader: vertex,
      fragmentShader: fragment,
    })

    this.DOM.planes.forEach((el, i) => {
      let material = this.material.clone()
      let rect = el.getBoundingClientRect()

      let rectObject = {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      }

      material.uniforms.uTexture.value = this.textureLoader.load(el.dataset.src)
      material.uniforms.uTexture.value.minFilter = THREE.LinearFilter
      material.uniforms.uTexture.value.generateMipmaps = false
      material.uniforms.uSize.value.x = rect.width
      material.uniforms.uSize.value.y = rect.height
      material.uniforms.uResolution.value.x = rect.width
      material.uniforms.uResolution.value.y = rect.height

      let mesh = new THREE.Mesh(this.geometry, material)
      mesh.scale.set(rect.width, rect.height, 1)

      this.planesObjects[i] = {
        el: el,
        x: 0,
        y: 0,
        my: 1 - (i % 5) * 0.1,
        mesh: mesh,
        rect: rectObject,
        xOffset: rect.left + rect.width / 2 - this.width / 2,
        yOffset: rect.top + rect.height / 2 - this.height / 2,
      }

      this.scene.add(mesh)
    })
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

    this.tx += -normalized.pixelX
    this.ty -= -normalized.pixelY
  }

  resize = () => {
    this.width = window.innerWidth
    this.height = window.innerHeight

    const { bottom, right } = this.DOM.grid.getBoundingClientRect()

    this.max.x = right
    this.max.y = bottom
  }
}

new Sketch({
  dom: document.getElementById("container"),
})
