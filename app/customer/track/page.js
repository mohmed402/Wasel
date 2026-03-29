import { Suspense } from 'react'
import TrackOrderView from './TrackOrderView'

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrderView />
    </Suspense>
  )
}
