'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Decor : vraies photos "vue du ciel" qui se fondent au fil du scroll.
// Depose ces images dans public/hero/ (paysage, libres de droit).
// Tant qu'une image manque, le degrade de secours s'affiche (rien ne casse).
const PHOTOS = [
  '/hero/01-nuit.jpg', // ville vue du ciel, de nuit
  '/hero/02-lever.jpg', // lever de soleil sur une cote / nuages
  '/hero/03-plage.jpg', // plage / mer turquoise vue d'avion
  '/hero/04-ville.jpg', // skyline / paysage de jour
]

export default function HeroCinematic() {
  const mountRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const animationRef = useRef<number | null>(null)

  const [stage, setStage] = useState(-1)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    if (!mountRef.current || !wrapRef.current) return

    if (rendererRef.current) {
      rendererRef.current.dispose()
      if (mountRef.current && rendererRef.current.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement)
      }
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const scrollMax = window.innerHeight * 3
    let targetScroll = 0
    let currentScroll = 0

    const stageRef = { current: -1 }

    // Canvas TRANSPARENT : seul l'avion est rendu, les photos sont derriere (CSS).
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    renderer.setClearColor(0x000000, 0)
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    requestAnimationFrame(() => {
      if (mountRef.current) mountRef.current.style.opacity = '1'
    })

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    )
    camera.position.set(6, 3, 38)

    // LIGHTS : eclairage neutre (lumiere du jour) pour que l'avion soit beau
    // au-dessus de n'importe quelle photo.
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

    // PLANE
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

          const materialName = child.material.name?.toLowerCase() || ''
          const childName = child.name?.toLowerCase() || ''
          const isWindow =
            materialName.includes('window') ||
            materialName.includes('glass') ||
            materialName.includes('vitre') ||
            childName.includes('window') ||
            childName.includes('glass') ||
            childName.includes('vitre')

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

    const onScroll = () => {
      targetScroll = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // Si on arrive sur une ancre (#inscription...), on la respecte au lieu de
    // forcer le haut de page (sinon la navigation par ancre est cassee).
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash)
      if (el) {
        requestAnimationFrame(() =>
          el.scrollIntoView({ behavior: 'auto', block: 'start' })
        )
      }
    } else {
      window.scrollTo(0, 0)
    }

    let tick = 0
    const planePos = { x: 16, y: -1, z: 0 }

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      tick += 0.01

      currentScroll += (targetScroll - currentScroll) * 0.08
      const p = Math.min(Math.max(currentScroll / scrollMax, 0), 1)
      setScrollProgress(p)

      const newStage =
        p < 0.05 ? -1 : p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3
      if (stageRef.current !== newStage) {
        stageRef.current = newStage
        setStage(newStage)
      }

      // Choregraphie camera (inchangee).
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

      const planeProgress = Math.min(p * 1.2, 1)
      planePos.z = -planeProgress * 22
      planePos.x = 16 - planeProgress * 10
      planePos.y = -1 + Math.sin(tick * 0.7) * 0.4 + planeProgress * 4

      plane.position.x = planePos.x + Math.sin(tick * 0.4) * 0.05
      plane.position.y = planePos.y + Math.sin(tick * 0.6) * 0.05
      plane.position.z = planePos.z
      plane.rotation.y = planeProgress * 0.45
      plane.rotation.z = Math.sin(tick * 0.5) * 0.05 + planeProgress * 0.12

      const finalScale = 1 + planeProgress * 1.4
      plane.scale.set(finalScale, finalScale, finalScale)

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
      cancelAnimationFrame(animationRef.current!)
      window.removeEventListener('scroll', onScroll)
      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (mountRef.current && rendererRef.current.domElement) {
          mountRef.current.removeChild(rendererRef.current.domElement)
        }
      }
    }
  }, [])

  // Opacite d'une photo selon l'avancement : fondu entre photos adjacentes.
  const layerOpacity = (i: number) => {
    const n = PHOTOS.length
    if (n <= 1) return 1
    const seg = 1 / (n - 1)
    const peak = i * seg
    return Math.max(0, Math.min(1, 1 - Math.abs(scrollProgress - peak) / seg))
  }

  const getDescriptionStyle = 'text-white/80'

  return (
    <div ref={wrapRef} style={{ height: '400vh' }} className="relative">
      {/* Precharge la 1re image du hero (meilleur LCP). */}
      <link rel="preload" as="image" href={PHOTOS[0]} />

      <div className="sticky top-16 w-full h-[85vh] overflow-hidden z-0">
        {/* Degrade de secours (visible si une photo manque) */}
        <div className="absolute inset-0 bg-linear-to-b from-[#050d1f] via-[#0b2a4a] to-[#7fb4e6]" />

        {/* Photos "vue du ciel" qui se fondent au scroll, avec lent zoom (Ken Burns) */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{ animation: 'hero-kenburns 26s ease-in-out infinite alternate' }}
        >
          {PHOTOS.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${src})`, opacity: layerOpacity(i) }}
            />
          ))}
        </div>

        {/* Scrim cinematique : bas + gauche + vignette (profondeur, lisibilite) */}
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-black/55 via-black/10 to-transparent" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(125% 100% at 50% 0%, transparent 55%, rgba(0,0,0,0.5) 100%)',
          }}
        />

        {/* Avion 3D (canvas transparent) */}
        <div
          ref={mountRef}
          className="absolute inset-0 opacity-0 transition-opacity duration-1000"
        />

        <div className="absolute inset-0 flex items-center justify-start px-8 md:px-16 lg:px-32 pt-16">
          <div className="max-w-xl pointer-events-none">
            <div className={`transition-all duration-700 ${stage >= 0 ? 'opacity-100' : 'opacity-0'}`}>
              <span className="inline-flex items-center gap-2 rounded-full backdrop-blur-sm px-4 py-1.5 text-sm font-semibold tracking-widest uppercase mb-6 border border-white/25 bg-white/10 text-white">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
                </svg>
                Newsletter · Deals vols BE / FR
              </span>
            </div>

            <div className={`transition-all duration-700 ${stage >= 1 ? 'opacity-100' : 'opacity-0'}`}>
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.03] tracking-tight"
                style={{ textShadow: '0 2px 24px rgba(0,0,0,0.45)' }}
              >
                Vole plus loin,
                <br />
                <span className="text-sky-300">paye moins.</span>
              </h1>
            </div>

            <div className={`transition-all duration-700 delay-75 ${stage >= 2 ? 'opacity-100' : 'opacity-0'}`}>
              <p
                className={`text-lg ${getDescriptionStyle} mt-3 max-w-md`}
                style={{ textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}
              >
                Deals vérifiés depuis la Belgique et la France.
              </p>
            </div>

            <div className={`transition-all duration-700 delay-150 ${stage >= 3 ? 'opacity-100' : 'opacity-0'}`}>
              <a
                href="#inscription"
                className="pointer-events-auto inline-block rounded-xl bg-brand hover:bg-brand-dark px-8 py-3 font-bold text-white shadow-lg shadow-brand/30 ring-1 ring-white/10 transition-all hover:scale-105 mt-5"
              >
                S&apos;inscrire
              </a>
            </div>
          </div>
        </div>

        {/* Ligne de progression : avancement dans l'animation (scroll) */}
        <div className="absolute bottom-8 left-8 right-8 md:left-16 md:right-16 lg:left-32 lg:right-32 z-10 pointer-events-none">
          <div className="relative h-px bg-white/20">
            <div
              className="absolute inset-y-0 left-0 bg-sky-400"
              style={{ width: `${Math.round(scrollProgress * 100)}%` }}
            />
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${Math.round(scrollProgress * 100)}%` }}
            >
              <span className="block h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
