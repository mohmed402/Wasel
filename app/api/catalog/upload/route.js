import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../server/supabase'

const BUCKET = 'catalog-images'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * POST /api/catalog/upload
 * Upload an image to Supabase Storage (catalog-images bucket).
 * Body: multipart/form-data with field "file"
 * Returns: { url: string }
 */
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'ملف مطلوب (field: file)' },
        { status: 400 }
      )
    }

    const { size, type, name } = file
    if (size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'حجم الملف يتجاوز 5 ميجابايت' },
        { status: 400 }
      )
    }
    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'نوع الملف غير مدعوم. استخدم: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      )
    }

    const ext = (name && name.split('.').pop()) || (type === 'image/png' ? 'png' : 'jpg')
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`

    const buffer = await file.arrayBuffer()
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: type,
        upsert: true
      })

    if (error) {
      if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
        const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: MAX_SIZE,
          allowedMimeTypes: ALLOWED_TYPES
        })
        if (createErr) {
          console.error('Create bucket error:', createErr)
          return NextResponse.json(
            { error: 'فشل إنشاء مجلد التخزين. أنشئ bucket باسم catalog-images في Supabase Storage (عام).' },
            { status: 500 }
          )
        }
        const { data: retryData, error: retryError } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(path, buffer, { contentType: type, upsert: true })
        if (retryError) {
          console.error('Retry upload error:', retryError)
          return NextResponse.json({ error: retryError.message }, { status: 500 })
        }
        const url = supabaseAdmin.storage.from(BUCKET).getPublicUrl(retryData.path).data.publicUrl
        return NextResponse.json({ url })
      }
      console.error('Upload error:', error)
      return NextResponse.json(
        { error: error.message || 'فشل رفع الملف' },
        { status: 500 }
      )
    }

    const url = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Catalog upload:', err)
    return NextResponse.json(
      { error: err.message || 'فشل رفع الملف' },
      { status: 500 }
    )
  }
}
