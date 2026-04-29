const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const TEXT = 'NP%20Fotografia'

export function getWatermarkedUrl(publicId: string, width = 600): string {
  const m = `l_text:Arial_36_bold:${TEXT},co_white,o_45`
  return [
    `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`,
    `${m},g_north_west,x_20,y_20`,
    `${m},g_center`,
    `${m},g_south_east,x_20,y_20`,
    `w_${width},e_blur:200,q_auto,f_webp`,
    publicId,
  ].join('/')
}

export function getPreviewUrl(publicId: string): string {
  const tile = `l_text:Arial_48_bold:${TEXT},co_white,o_45,a_-20,fl_tiled`
  return [
    `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`,
    tile,
    `w_1200,e_blur:150,q_auto,f_webp`,
    publicId,
  ].join('/')
}

export function getOriginalUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_webp/${publicId}`
}

export function getHeroThumbnailUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_600,h_400,c_fill,g_auto,q_auto:low,f_webp/${publicId}`
}

export function getDownloadUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment/${publicId}`
}
