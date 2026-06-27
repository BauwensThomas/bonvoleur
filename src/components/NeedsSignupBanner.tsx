'use client'

import { useSearchParams } from 'next/navigation'

export default function NeedsSignupBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('besoin_inscription') !== '1') return null
  return (
    <p className="mb-4 rounded-lg bg-brand/10 px-4 py-3 text-sm text-brand-dark">
      Tu n&apos;as pas encore de compte BonVoleur. Inscris-toi ici
      (gratuit) pour accéder à ton espace bons plans.
    </p>
  )
}
