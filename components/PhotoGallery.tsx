'use client'

import PhotoCard from './PhotoCard'
import type { Photo } from '@/types'

interface PhotoGalleryProps {
  photos: Photo[]
  bibNumber: number
}

export default function PhotoGallery({ photos, bibNumber }: PhotoGalleryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} bibNumber={bibNumber} />
      ))}
    </div>
  )
}
