'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CustomerSiteHeader from '../CustomerSiteHeader'
import { setSession, isLoggedIn } from '../auth'
import styles from './login.module.css'

function LogoMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <rect width="44" height="44" rx="12" fill="#0a0d0f" stroke="#08af66" strokeWidth="1.5" />
      <circle cx="22" cy="22" r="9" stroke="#08af66" strokeWidth="1.5" />
      <circle cx="22" cy="22" r="3" fill="#08af66" />
    </svg>
  )
}

export default function CustomerLoginPage() {
  const router = useRouter()
  const phoneRef = useRef(null)

  const [phase, setPhase] = useState('phone') // 'phone' | 'password' | 'register'
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lookupDone, setLookupDone] = useState(false)
  const [hasAccount, setHasAccount] = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (isLoggedIn()) router.replace('/customer/dashboard')
  }, [router])

  useEffect(() => {
    phoneRef.current?.focus()
  }, [])

  const normalizePhone = (p) =>
    p.replace(/\s+/g, '').replace(/^\+?218/, '0').trim()

  const handlePhoneContinue = async () => {
    const p = normalizePhone(phone)
    if (p.length < 9) { setError('أدخل رقم هاتف صحيح'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(p)}`)
      const data = await res.json()
      setLookupDone(true)
      if (data.found && data.customer.hasPassword) {
        setHasAccount(true)
        setPhase('password')
      } else if (data.found) {
        // Has a customer record but no password yet — set one
        setName(data.customer.name || '')
        setHasAccount(true)
        setPhase('register')
      } else {
        setHasAccount(false)
        setPhase('register')
      }
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!password) { setError('أدخل كلمة المرور'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'كلمة المرور غير صحيحة'); return }
      setSession(data.session)
      router.replace('/customer/dashboard')
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!name.trim()) { setError('أدخل اسمك الكامل'); return }
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    if (password !== confirmPassword) { setError('كلمتا المرور غير متطابقتين'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), password, name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'تعذر إنشاء الحساب'); return }
      setSession(data.session)
      router.replace('/customer/dashboard')
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter') action()
  }

  return (
    <div className={styles.page}>
      <CustomerSiteHeader basketCount={0} />

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <LogoMark />
            <h1 className={styles.cardTitle}>
              {phase === 'password' ? 'أدخل كلمة المرور' :
               phase === 'register' ? (hasAccount ? 'أنشئ كلمة مرور' : 'إنشاء حساب جديد') :
               'تسجيل الدخول'}
            </h1>
            <p className={styles.cardSub}>
              {phase === 'phone' && 'أدخل رقم هاتفك للمتابعة'}
              {phase === 'password' && `مرحباً! أدخل كلمتك السرية للدخول.`}
              {phase === 'register' && (hasAccount
                ? 'لديك حساب بدون كلمة مرور — أنشئ واحدة الآن.'
                : 'رقمك غير مسجل — أنشئ حساباً مجانياً.')}
            </p>
          </div>

          <div className={styles.fields}>
            {/* Phone field — always visible */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="login-phone">رقم الهاتف</label>
              <div className={styles.inputWrap}>
                <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.64 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <input
                  id="login-phone"
                  ref={phase === 'phone' ? phoneRef : undefined}
                  className={styles.input}
                  type="tel"
                  dir="ltr"
                  placeholder="09xxxxxxxx"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(''); if (lookupDone) { setLookupDone(false); setPhase('phone') } }}
                  onKeyDown={(e) => phase === 'phone' && handleKeyDown(e, handlePhoneContinue)}
                  disabled={phase !== 'phone' && loading}
                  autoComplete="tel"
                />
                {phase !== 'phone' && (
                  <button type="button" className={styles.changeBtn} onClick={() => { setPhase('phone'); setLookupDone(false); setError('') }}>
                    تغيير
                  </button>
                )}
              </div>
            </div>

            {/* Register: name */}
            {phase === 'register' && !hasAccount && (
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="login-name">الاسم الكامل</label>
                <div className={styles.inputWrap}>
                  <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    id="login-name"
                    className={styles.input}
                    type="text"
                    placeholder="الاسم الكامل"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError('') }}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            {(phase === 'password' || phase === 'register') && (
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="login-pass">كلمة المرور</label>
                <div className={styles.inputWrap}>
                  <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="login-pass"
                    className={styles.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder={phase === 'register' ? 'أدخل كلمة مرور جديدة...' : 'كلمة المرور'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    onKeyDown={(e) => phase === 'password' && handleKeyDown(e, handleLogin)}
                    autoComplete={phase === 'password' ? 'current-password' : 'new-password'}
                    autoFocus={phase === 'password'}
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'إخفاء' : 'إظهار'}
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm password (register only) */}
            {phase === 'register' && (
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="login-confirm">تأكيد كلمة المرور</label>
                <div className={styles.inputWrap}>
                  <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="login-confirm"
                    className={styles.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder="أعد إدخال كلمة المرور"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                    onKeyDown={(e) => handleKeyDown(e, handleRegister)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {error && <p className={styles.error} role="alert">{error}</p>}

            {/* Primary action */}
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={phase === 'phone' ? handlePhoneContinue : phase === 'password' ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} aria-hidden />
              ) : null}
              {loading ? 'جاري...' :
               phase === 'phone' ? 'متابعة' :
               phase === 'password' ? 'تسجيل الدخول' :
               'إنشاء الحساب'}
            </button>

            {phase === 'password' && (
              <p className={styles.hint}>
                ليس لديك حساب بكلمة مرور؟{' '}
                <button type="button" className={styles.textBtn} onClick={() => { setPhase('register'); setPassword(''); setConfirmPassword(''); setError('') }}>
                  إنشاء كلمة مرور
                </button>
              </p>
            )}
          </div>

          <div className={styles.cardFooter}>
            <Link href="/" className={styles.backLink}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              العودة إلى الرئيسية
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
