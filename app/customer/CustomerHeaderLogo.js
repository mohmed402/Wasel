'use client'

import Image from 'next/image'
import Link from 'next/link'
import styles from './customer.module.css'

const W = 1024
const H = 456

/**
 * @param {{ children?: import('react').ReactNode }} props
 */
export default function CustomerHeaderLogo({ children }) {
  return (
    <div className={styles.logoBlock}>
      {children}
      <Link href="/" className={styles.headerLogoLink} aria-label="MORE Express — الرئيسية">
        <Image
          src="/more-express-logo.png"
          alt="MORE Express"
          width={W}
          height={H}
          className={styles.headerLogoImg}
          priority
        />
      </Link>
    </div>
  )
}
