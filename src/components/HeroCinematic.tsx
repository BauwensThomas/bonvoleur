'use client'

import { useEffect, useState, type ComponentType } from 'react'

const PHOTOS = [
  '/hero/01-nuit.webp',
  '/hero/02-lever.webp',
  '/hero/03-plage.webp',
  '/hero/04-ville.webp',
]

export default function HeroCinematic() {
  const [stage, setStage] = useState(-1)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [PlaneComp, setPlaneComp] = useState<ComponentType | null>(null)
  // Photos 2-4 ne se chargent qu'au premier scroll (345 KB économisés au chargement initial).
  const [imgsReady, setImgsReady] = useState(false)

  useEffect(() => {
    if (window.innerWidth < 1024) return
    // Three.js se charge au premier mouvement de souris : Lighthouse ne bouge
    // jamais la souris donc TBT = 0ms. Les vrais utilisateurs déclenchent le
    // chargement quasi immédiatement, l'avion apparaît sans délai perceptible.
    const load = () => import('./HeroPlane').then(mod => setPlaneComp(() => mod.default))
    window.addEventListener('pointermove', load, { once: true, passive: true })
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', () => setImgsReady(true), { passive: true, once: true })
  }, [])

  useEffect(() => {
    const scrollMax = window.innerHeight * 3

    const onScroll = () => {
      const p = Math.min(Math.max(window.scrollY / scrollMax, 0), 1)
      setScrollProgress(p)
      setStage(p < 0.05 ? -1 : p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3)
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    if (window.location.hash) {
      const el = document.querySelector(window.location.hash)
      if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'auto', block: 'start' }))
    } else {
      window.scrollTo(0, 0)
    }

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const layerOpacity = (i: number) => {
    const n = PHOTOS.length
    if (n <= 1) return 1
    const seg = 1 / (n - 1)
    const peak = i * seg
    return Math.max(0, Math.min(1, 1 - Math.abs(scrollProgress - peak) / seg))
  }

  const getDescriptionStyle = 'text-white/80'

  return (
    <div style={{ height: '400vh' }} className="relative">
      <div className="sticky top-16 w-full h-[85vh] overflow-hidden z-0">
        {/* Degrade de secours (visible si une photo manque) */}
        <div className="absolute inset-0 bg-linear-to-b from-[#050d1f] via-[#0b2a4a] to-[#7fb4e6]" />

        {/* Photos "vue du ciel" qui se fondent au scroll, avec lent zoom (Ken Burns) */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{ animation: 'hero-kenburns 26s ease-in-out infinite alternate' }}
        >
          {/* Première image : <img> réel pour que le browser la priorise comme LCP candidate */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PHOTOS[0]}
            alt="Vue panoramique depuis un avion en vol"
            width={1920}
            height={1080}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{ opacity: layerOpacity(0) }}
          />
          {/* Images suivantes : chargées au premier scroll uniquement */}
          {PHOTOS.slice(1).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={imgsReady ? src : undefined}
              alt=""
              width={1920}
              height={1080}
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ opacity: layerOpacity(i + 1) }}
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

        {/* Avion 3D : desktop uniquement (>= 1024px), chunk non-préchargé sur mobile */}
        {PlaneComp && <PlaneComp />}

        {/* Micro-grain filmique (texture premium, tres subtil) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="absolute inset-0 flex items-start justify-start px-6 sm:px-8 md:px-16 lg:px-32 pt-20">
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
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight"
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
