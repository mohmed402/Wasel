import { Suspense } from 'react'
import CustomerHome from './customer/CustomerHome'

export const metadata = {
  title: 'MORE Holding Co. - العملاء',
  description: 'تتبع الطلب، عرض سلة Shein، وإضافة منتجات',
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <CustomerHome />
    </Suspense>
  )
}
