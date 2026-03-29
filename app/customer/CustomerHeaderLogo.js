'use client'

import Image from 'next/image'
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
      <span className={styles.headerLogoLink}>
        <Image
          src="/more-express-logo.png"
          alt="MORE Express"
          width={W}
          height={H}
          className={styles.headerLogoImg}
          priority
        />
      </span>
    </div>
  )
}
