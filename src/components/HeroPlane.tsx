'use client'

// Scène Three.js isolée dans son propre chunk JS.
// Importé en dynamic (ssr:false) depuis HeroCinematic pour ne pas alourdir
// le bundle initial et ne pas bloquer le thread principal au chargement.

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default function HeroPlane() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    requestAnimationFrame(() => { el.style.opacity = '1' })

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500)
    camera.position.set(6, 3, 38)

    let xf = 1
    let yOff = 0
    const fitView = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const aspect = w / h
      camera.aspect = aspect
      const targetH = 2 * Math.atan(Math.tan(((50 * Math.PI) / 180) / 2) * (16 / 9))
      const vFov = (2 * Math.atan(Math.tan(targetH / 2) / aspect) * 180) / Math.PI
      camera.fov = Math.min(Math.max(vFov, 50), 86)
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      const isStacked = w <= 1450
      xf = isStacked ? Math.min(1, aspect / 1.4) : 1
      yOff = isStacked ? -3 : 0
    }
    fitView()
    window.addEventListener('resize', fitView)

    scene.add(new THREE.AmbientLight(0xffffff, 2.2))
    const key = new THREE.DirectionalLight(0xffffff, 5)
    key.position.set(12, 18, -8)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 2)
    fill.position.set(-10, 4, 12)
    scene.add(fill)
    const planeLight = new THREE.DirectionalLight(0xffffff, 3)
    planeLight.position.set(5, 8, 10)
    scene.add(planeLight)
    const engL = new THREE.PointLight(0x88ccff, 6, 20)
    engL.position.set(-6, -1.5, 2)
    scene.add(engL)
    const engR = new THREE.PointLight(0x88ccff, 6, 20)
    engR.position.set(6, -1.5, 2)
    scene.add(engR)
    const cockpitLight = new THREE.PointLight(0xccddff, 2.5, 12)
    cockpitLight.position.set(0, 1, -5)
    scene.add(cockpitLight)

    const plane = new THREE.Group()
    scene.add(plane)

    const loader = new GLTFLoader()
    loader.load('/models/A320.glb', (gltf) => {
      const model = gltf.scene
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const scale = 28 / Math.max(size.x, size.y, size.z)
      model.scale.setScalar(scale)
      const center = box.getCenter(new THREE.Vector3())
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
      model.rotation.y = Math.PI

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model.traverse((child: any) => {
        if (child.isMesh && child.material) {
          child.castShadow = true
          child.receiveShadow = true
          child.material.metalness = 0.85
          child.material.roughness = 0.2
          child.material.emissive = new THREE.Color(0x222222)
          child.material.emissiveIntensity = 0.15
          const mn = child.material.name?.toLowerCase() || ''
          const cn = child.name?.toLowerCase() || ''
          const isWindow = mn.includes('window') || mn.includes('glass') || mn.includes('vitre') || cn.includes('window') || cn.includes('glass') || cn.includes('vitre')
          if (isWindow) {
            child.material.color.setHex(0x1a2a3a)
            child.material.emissiveIntensity = 0
            child.material.metalness = 0.3
            child.material.roughness = 0.5
          } else if (child.material.color && child.material.color.getHex() > 0x888888) {
            child.material.emissiveIntensity = 0.3
            child.material.color.setHex(0xf2f2f2)
          } else {
            child.material.metalness = 0.9
            child.material.roughness = 0.15
          }
          child.material.transparent = false
          child.material.opacity = 1
        }
      })
      plane.add(model)
    })

    const cam = { x: 6, y: 3, z: 38 }
    const scrollMax = window.innerHeight * 3
    let targetScroll = 0
    let currentScroll = 0
    let tick = 0
    const planePos = { x: 16, y: -1, z: 0 }

    const onScroll = () => { targetScroll = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      tick += 0.01

      currentScroll += (targetScroll - currentScroll) * 0.08
      const p = Math.min(Math.max(currentScroll / scrollMax, 0), 1)

      if (p <= 0.4) {
        const t = p / 0.4
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        cam.z = 42 - e * 26
        cam.y = 4 - e * 2
      } else if (p <= 0.7) {
        const t = (p - 0.4) / 0.3
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        cam.z = 16 + e * 8
        cam.y = 2 - e * 4
        cam.x = e * 6
      } else {
        const t = (p - 0.7) / 0.3
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        cam.z = 24 + e * 12
        cam.y = -2 + e * 14
        cam.x = 6 - e * 6
      }

      const pp = Math.min(p * 1.2, 1)
      planePos.z = -pp * 22
      planePos.x = (16 - pp * 10) * xf
      planePos.y = -1 + Math.sin(tick * 0.7) * 0.4 + pp * 4 + yOff

      plane.position.x = planePos.x + Math.sin(tick * 0.4) * 0.05
      plane.position.y = planePos.y + Math.sin(tick * 0.6) * 0.05
      plane.position.z = planePos.z
      plane.rotation.y = pp * 0.45
      plane.rotation.z = Math.sin(tick * 0.5) * 0.05 + pp * 0.12
      const fs = 1 + pp * 1.4
      plane.scale.set(fs, fs, fs)

      camera.position.x += (cam.x - camera.position.x) * 0.06
      camera.position.y += (cam.y - camera.position.y) * 0.06
      camera.position.z += (cam.z - camera.position.z) * 0.06
      camera.lookAt(0, 0, 0)

      engL.intensity = 6 + Math.sin(tick * 12) * 1.5
      engR.intensity = 6 + Math.sin(tick * 12 + 1.3) * 1.5
      cockpitLight.intensity = 2.5 + Math.sin(tick * 4) * 0.5
      planeLight.intensity = 3 + Math.sin(tick * 2) * 0.5

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', fitView)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={mountRef} className="absolute inset-0 opacity-0 transition-opacity duration-1000" />
  )
}
