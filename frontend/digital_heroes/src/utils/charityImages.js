import childrensGolfFoundationImg from '../../assets/children_golf_foundation.jpeg'
import veteransOnTheFairwayImg from '../../assets/Veterans_on_the_Fairway.jpeg'
import juniorGolfAcademyImg from '../../assets/Junior_Golf_academy.jpeg'
import golfForGoodImg from '../../assets/golf_for_good.jpeg'
import greenFairwaysTrustImg from '../../assets/Green_Fairways_Trust.jpeg'

const charityImageMap = {
  'childrens-golf-foundation': childrensGolfFoundationImg,
  'veterans-on-the-fairway': veteransOnTheFairwayImg,
  'junior-golf-academy': juniorGolfAcademyImg,
  'golf-for-good': golfForGoodImg,
  'green-fairways-trust': greenFairwaysTrustImg,
}

const getApiOrigin = () => {
  const baseUrl = import.meta.env.VITE_API_URL
  if (!baseUrl || typeof baseUrl !== 'string') return ''
  try {
    return new URL(baseUrl).origin
  } catch {
    return ''
  }
}

const resolveImageUrl = (value) => {
  if (!value || typeof value !== 'string') return null
  if (value.startsWith('http://') || value.startsWith('https://')) return value

  const origin = getApiOrigin()
  if (!origin) return value

  if (value.startsWith('/')) {
    return `${origin}${value}`
  }

  return `${origin}/${value}`
}

export const getCharityImage = (charity) => {
  const mappedImage = charityImageMap[charity?.slug]
  if (mappedImage) return mappedImage

  const logoUrl = resolveImageUrl(charity?.logo)
  if (logoUrl) return logoUrl

  const bannerUrl = resolveImageUrl(charity?.banner_image)
  if (bannerUrl) return bannerUrl

  return null
}
