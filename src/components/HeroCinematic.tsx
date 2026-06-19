'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default function HeroCinematic() {
  const mountRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
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

    const renderer = new THREE.WebGLRenderer({ antialias: true })

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true

    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.85

    renderer.setClearColor(0x050d1f, 1)
    mountRef.current.appendChild(renderer.domElement)

    rendererRef.current = renderer

    requestAnimationFrame(() => {
      if (mountRef.current) {
        mountRef.current.style.opacity = '1'
      }
    })

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050d1f)
    scene.fog = new THREE.FogExp2(0x050d1f, 0.006)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    )
    camera.position.set(6, 3, 38)
    cameraRef.current = camera

    // LIGHTS
    scene.add(new THREE.AmbientLight(0x4a6b8a, 2.8))

    const key = new THREE.DirectionalLight(0xffffff, 7)
    key.position.set(12, 18, -8)
    scene.add(key)

    const fill = new THREE.DirectionalLight(0xffffff, 1.8)
    fill.position.set(-10, 4, 12)
    scene.add(fill)

    const rim = new THREE.DirectionalLight(0x88bbff, 2.2)
    rim.position.set(-6, 2, -10)
    scene.add(rim)

    const planeLight = new THREE.DirectionalLight(0xffffff, 4)
    planeLight.position.set(5, 8, 10)
    scene.add(planeLight)

    const engL = new THREE.PointLight(0x88ccff, 7, 20)
    engL.position.set(-6, -1.5, 2)
    scene.add(engL)

    const engR = new THREE.PointLight(0x88ccff, 7, 20)
    engR.position.set(6, -1.5, 2)
    scene.add(engR)

    const cockpitLight = new THREE.PointLight(0xccddff, 3, 12)
    cockpitLight.position.set(0, 1, -5)
    scene.add(cockpitLight)

    const sun = new THREE.DirectionalLight(0xffcc88, 3)
    sun.position.set(10, -10, -10)
    scene.add(sun)

    const sunTarget = new THREE.Object3D()
    scene.add(sunTarget)
    sun.target = sunTarget

    // SUN DISK
    const sunGroup = new THREE.Group()
    scene.add(sunGroup)
    
    const sunCoreGeometry = new THREE.SphereGeometry(0.8, 128, 128)
    const sunCoreMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa66,
      emissive: 0xff4422,
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.2
    })
    const sunCore = new THREE.Mesh(sunCoreGeometry, sunCoreMaterial)
    sunGroup.add(sunCore)
    
    const innerGlowGeometry = new THREE.SphereGeometry(1.1, 64, 64)
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    })
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial)
    sunGroup.add(innerGlow)
    
    const outerGlowGeometry = new THREE.SphereGeometry(1.6, 64, 64)
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6633,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    })
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial)
    sunGroup.add(outerGlow)
    
    const haloGeometry = new THREE.SphereGeometry(2.5, 32, 32)
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4422,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    })
    const halo = new THREE.Mesh(haloGeometry, haloMaterial)
    sunGroup.add(halo)

    sunGroup.position.set(20, -27, -20)
    sunGroup.visible = false

    // STARS
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(4000 * 3)

    for (let i = 0; i < starPos.length / 3; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 500
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 250
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 200 - 80
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))

    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.06,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
      })
    )

    scene.add(stars)

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
      model.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      )

      model.rotation.y = Math.PI

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model.traverse((child: any) => {
        if (child.isMesh && child.material) {
          child.castShadow = true
          child.receiveShadow = true
          
          // Garder l'avion clair et brillant
          child.material.metalness = 0.85
          child.material.roughness = 0.2
          child.material.emissive = new THREE.Color(0x222222)
          child.material.emissiveIntensity = 0.2
          
          // Rendre les fenêtres opaques et sombres
          // On détecte les fenêtres par leur nom ou leur matériau
          const materialName = child.material.name?.toLowerCase() || ''
          const childName = child.name?.toLowerCase() || ''
          
          // Liste des mots-clés qui indiquent une fenêtre
          const isWindow = materialName.includes('window') || 
                           materialName.includes('glass') ||
                           materialName.includes('vitre') ||
                           childName.includes('window') ||
                           childName.includes('glass') ||
                           childName.includes('vitre')
          
          if (isWindow) {
            // Fenêtre : couleur sombre, opaque
            child.material.color.setHex(0x1a2a3a)
            child.material.emissiveIntensity = 0
            child.material.metalness = 0.3
            child.material.roughness = 0.5
          } else if (child.material.color && child.material.color.getHex() > 0x888888) {
            // Parties blanches de l'avion : plus lumineuses
            child.material.emissiveIntensity = 0.35
            child.material.color.setHex(0xf0f0f0)
          } else {
            // Parties grises/métalliques
            child.material.metalness = 0.9
            child.material.roughness = 0.15
          }
          
          // Forcer l'opacité à 1 pour tout
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
    // Si on arrive sur une ancre (#inscription, #deals...), on la respecte au
    // lieu de forcer le haut (sinon la navigation par ancre est cassee).
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
        p < 0.05 ? -1 :
        p < 0.25 ? 0 :
        p < 0.5 ? 1 :
        p < 0.75 ? 2 :
        3

      if (stageRef.current !== newStage) {
        stageRef.current = newStage
        setStage(newStage)
      }

      const sunProgress = Math.max(0, (p - 0.05) / 0.7)
      const isSunVisible = p > 0.05
      
      if (isSunVisible) {
        sunGroup.visible = true
        
        const easeOutCubic = 1 - Math.pow(1 - sunProgress, 3)
        
        const targetY = -27 + easeOutCubic * 37
        const targetX = 22 - easeOutCubic * 30
        const targetZ = -22 + easeOutCubic * 12
        
        const arcY = Math.sin(easeOutCubic * Math.PI) * 1.5
        const finalY = targetY + arcY
        
        sunGroup.position.y = finalY
        sunGroup.position.x = targetX
        sunGroup.position.z = targetZ
        
        sunGroup.rotation.z = -easeOutCubic * 0.3
        
        const lightIntensity = 1 + sunProgress * 7
        sun.intensity = lightIntensity
        
        if (sunProgress < 0.4) {
          const t = sunProgress / 0.4
          sunCoreMaterial.color.setHex(0xff6644)
          sunCoreMaterial.emissiveIntensity = 0.8 + t * 1.5
          innerGlowMaterial.color.setHex(0xff7744)
          outerGlowMaterial.color.setHex(0xff5533)
          sun.color.setHex(0xff8866)
        } else if (sunProgress < 0.7) {
          const t = (sunProgress - 0.4) / 0.3
          sunCoreMaterial.color.setHex(0xffaa77)
          sunCoreMaterial.emissiveIntensity = 1.8 + t * 0.5
          innerGlowMaterial.color.setHex(0xffaa66)
          outerGlowMaterial.color.setHex(0xff7744)
          sun.color.setHex(0xffaa77)
        } else {
          sunCoreMaterial.color.setHex(0xffdd99)
          sunCoreMaterial.emissiveIntensity = 2.2
          innerGlowMaterial.color.setHex(0xffcc88)
          outerGlowMaterial.color.setHex(0xffaa66)
          sun.color.setHex(0xffdd99)
        }
        
        const scaleFactor = sunProgress < 0.3 
          ? 0.8 + Math.sin(sunProgress * Math.PI) * 0.7 
          : 1.3 - (sunProgress - 0.3) * 0.8
        sunGroup.scale.setScalar(Math.max(0.6, Math.min(1.4, scaleFactor)))
        
        const glowIntensity = Math.min(1, sunProgress * 2)
        innerGlowMaterial.opacity = 0.3 + glowIntensity * 0.3
        outerGlowMaterial.opacity = 0.15 + glowIntensity * 0.15
        haloMaterial.opacity = 0.05 + glowIntensity * 0.1
        
        sunGroup.rotation.y = tick * 0.5
        sunGroup.rotation.x = Math.sin(tick * 0.3) * 0.1
        
      } else {
        sunGroup.visible = false
        sun.intensity = 1
      }

      const nightColor = new THREE.Color(0x050d1f)
      const sunriseColor = new THREE.Color(0xff6a3d)
      const dayColor = new THREE.Color(0x87c7ff)
      
      let skyColor: THREE.Color
      let fogColor: THREE.Color
      
      if (p < 0.1) {
        skyColor = nightColor
        fogColor = nightColor
      } else if (p < 0.4) {
        const t = (p - 0.1) / 0.3
        const easeOut = 1 - Math.pow(1 - t, 2)
        skyColor = nightColor.clone().lerp(sunriseColor, easeOut)
        fogColor = skyColor
      } else if (p < 0.7) {
        const t = (p - 0.4) / 0.3
        const easeInOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        skyColor = sunriseColor.clone().lerp(dayColor, easeInOut)
        fogColor = skyColor
      } else {
        skyColor = dayColor
        fogColor = dayColor
      }

      scene.background = skyColor
      if (scene.fog) {
        scene.fog.color = fogColor
      }
      
      const ambientIntensity = 2.8 + sunProgress * 2.5
      scene.children.forEach(child => {
        if (child instanceof THREE.AmbientLight) {
          child.intensity = ambientIntensity
        }
      })
      
      if (p < 0.25) {
        stars.material.opacity = 0.9 * (1 - p / 0.25)
      } else {
        stars.material.opacity = 0
      }

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
      planePos.y =
        -1 +
        Math.sin(tick * 0.7) * 0.4 +
        planeProgress * 4

      plane.position.x = planePos.x + Math.sin(tick * 0.4) * 0.05
      plane.position.y = planePos.y + Math.sin(tick * 0.6) * 0.05
      plane.position.z = planePos.z

      plane.rotation.y = planeProgress * 0.45
      plane.rotation.z =
        Math.sin(tick * 0.5) * 0.05 + planeProgress * 0.12

      const finalScale = 1 + planeProgress * 1.4
      plane.scale.set(finalScale, finalScale, finalScale)

      camera.position.x += (cam.x - camera.position.x) * 0.06
      camera.position.y += (cam.y - camera.position.y) * 0.06
      camera.position.z += (cam.z - camera.position.z) * 0.06
      camera.lookAt(0, 0, 0)

      engL.intensity = 6 + Math.sin(tick * 12) * 1.5
      engR.intensity = 6 + Math.sin(tick * 12 + 1.3) * 1.5
      cockpitLight.intensity = 2.5 + Math.sin(tick * 4) * 0.5
      planeLight.intensity = 3.5 + Math.sin(tick * 2) * 0.5

      stars.rotation.y += 0.0005

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

  const newsletterStyle = {
    bg: 'bg-sky-500/15',
    border: 'border-sky-400/25',
    text: 'text-sky-800'
  }

  const getDescriptionStyle = () => {
    if (scrollProgress < 0.5) {
      return 'text-white/60'
    } else {
      return 'text-gray-700/80'
    }
  }

  return (
    <div ref={wrapRef} style={{ height: '400vh' }} className="relative">

      <div className="sticky top-16 w-full h-[85vh] overflow-hidden z-0">

        <div
          ref={mountRef}
          className="absolute inset-0 opacity-0 transition-opacity duration-1000"
        />

        <div className="absolute inset-0 flex items-center justify-start px-8 md:px-16 lg:px-32 pt-16">
          <div className="max-w-xl pointer-events-none">

            <div className={`transition-all duration-700 ${stage >= 0 ? "opacity-100" : "opacity-0"}`}>
              <span className={`inline-flex items-center gap-2 rounded-full backdrop-blur-sm px-4 py-1.5 text-sm font-semibold tracking-widest uppercase mb-6 border ${newsletterStyle.bg} ${newsletterStyle.border} ${newsletterStyle.text}`}>
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

            <div className={`transition-all duration-700 ${stage >= 1 ? "opacity-100" : "opacity-0"}`}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05]">
                Vole plus loin,
                <br />
                <span className="text-sky-800">
                  paye moins.
                </span>
              </h1>
            </div>

            <div className={`transition-all duration-700 delay-75 ${stage >= 2 ? "opacity-100" : "opacity-0"}`}>
              <p className={`text-lg ${getDescriptionStyle()} mt-2`}>
                Deals vérifiés depuis la Belgique et la France.
              </p>
            </div>

            <div className={`transition-all duration-700 delay-150 ${stage >= 3 ? "opacity-100" : "opacity-0"}`}>
              <a href="#inscription" className="pointer-events-auto inline-block rounded-xl bg-brand hover:bg-brand-dark px-8 py-3 font-bold text-white transition-all hover:scale-105 mt-4">
                S&apos;inscrire
              </a>
            </div>

          </div>
        </div>

        {/* Ligne de progression : montre l'avancement dans l'animation (scroll) */}
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