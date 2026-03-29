'use client'

import { useEffect } from 'react'

export default function HowToOrderRedirectPage() {
  useEffect(() => {
    window.location.replace('/#how-to-order')
  }, [])

  return (
    <p style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui' }}>
      جاري التوجيه…
    </p>
  )
}
