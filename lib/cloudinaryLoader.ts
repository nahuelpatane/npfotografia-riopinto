import type { ImageLoaderProps } from 'next/image'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  // Pre-built Cloudinary URL (watermarked, blurred, etc.) — only swap the width
  if (src.startsWith('https://res.cloudinary.com')) {
    return src.replace(/\/w_\d+([,/])/, `/w_${width}$1`)
  }

  // Raw public ID — build an optimized delivery URL
  const q = quality ?? 'auto'
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_${width},q_${q},f_auto/${src}`
}
