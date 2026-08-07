/**
 * Scrape county images from Wikipedia
 */

interface WikipediaImage {
  photoUrl: string
  attribution: string | null
}

/**
 * Search for a Wikipedia page and extract the main infobox image
 */
async function searchWikipedia(countyName: string): Promise<string | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(countyName)}&format=json&origin=*`
    const searchResponse = await fetch(searchUrl)
    const searchData = await searchResponse.json()
    
    if (!searchData.query?.search?.[0]) {
      return null
    }
    
    return searchData.query.search[0].title
  } catch (error) {
    console.error(`[wikipedia-scraper] Search failed for ${countyName}:`, error)
    return null
  }
}

/**
 * Get page image from Wikipedia API
 */
async function getPageImage(pageTitle: string): Promise<WikipediaImage | null> {
  try {
    // Get page info with main image
    const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages|images&pithumbsize=1200&format=json&origin=*`
    const pageResponse = await fetch(pageUrl)
    const pageData = await pageResponse.json()
    
    const pages = pageData.query?.pages
    if (!pages) return null
    
    const page = Object.values(pages)[0] as any
    const imageUrl = page?.thumbnail?.source
    
    if (imageUrl) {
      return {
        photoUrl: imageUrl,
        attribution: `Wikipedia - ${pageTitle}`,
      }
    }
    
    // If no thumbnail, try to get images from the page
    const images = page?.images
    if (!images || images.length === 0) return null
    
    // Try to find a good main image (not icons/flags)
    for (const img of images) {
      const imgTitle = img.title
      const imgName = imgTitle.toLowerCase()
      
      // Skip common non-photo images
      if (
        imgName.includes('flag') ||
        imgName.includes('coat') ||
        imgName.includes('arms') ||
        imgName.includes('icon') ||
        imgName.includes('.svg') ||
        imgName.includes('map')
      ) {
        continue
      }
      
      // Get image info
      const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(imgTitle)}&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*`
      const imgResponse = await fetch(imgUrl)
      const imgData = await imgResponse.json()
      
      const imgPages = imgData.query?.pages
      if (!imgPages) continue
      
      const imgPage = Object.values(imgPages)[0] as any
      const imgInfo = imgPage?.imageinfo?.[0]
      
      if (imgInfo?.thumburl || imgInfo?.url) {
        return {
          photoUrl: imgInfo.thumburl || imgInfo.url,
          attribution: `Wikipedia - ${pageTitle}`,
        }
      }
    }
    
    return null
  } catch (error) {
    console.error(`[wikipedia-scraper] Image fetch failed for ${pageTitle}:`, error)
    return null
  }
}

/**
 * Scrape a county image from Wikipedia
 */
export async function scrapeCountyImageFromWikipedia(
  countyName: string,
): Promise<WikipediaImage | null> {
  try {
    // Try different search variations
    const searchVariations = [
      countyName,
      `${countyName} England`,
      `${countyName} UK`,
      `${countyName} United Kingdom`,
      `${countyName} county`,
    ]
    
    for (const searchTerm of searchVariations) {
      const pageTitle = await searchWikipedia(searchTerm)
      if (!pageTitle) continue
      
      const image = await getPageImage(pageTitle)
      if (image) {
        return image
      }
    }
    
    return null
  } catch (error) {
    console.error(`[wikipedia-scraper] Failed for ${countyName}:`, error)
    return null
  }
}

/**
 * Alternative: Scrape from Wikimedia Commons
 */
export async function scrapeCountyImageFromCommons(
  countyName: string,
): Promise<WikipediaImage | null> {
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(countyName + ' landscape England')}&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*`
    
    const response = await fetch(searchUrl)
    const data = await response.json()
    
    const pages = data.query?.pages
    if (!pages) return null
    
    // Get first valid image
    for (const page of Object.values(pages) as any[]) {
      const imageInfo = page.imageinfo?.[0]
      if (imageInfo?.thumburl || imageInfo?.url) {
        return {
          photoUrl: imageInfo.thumburl || imageInfo.url,
          attribution: `Wikimedia Commons`,
        }
      }
    }
    
    return null
  } catch (error) {
    console.error(`[commons-scraper] Failed for ${countyName}:`, error)
    return null
  }
}

/**
 * Try multiple sources to get the best county image
 */
export async function fetchCountyImageFromWeb(
  countyName: string,
): Promise<WikipediaImage | null> {
  // Try Wikipedia first
  let result = await scrapeCountyImageFromWikipedia(countyName)
  if (result) return result
  
  // Fall back to Wikimedia Commons
  result = await scrapeCountyImageFromCommons(countyName)
  if (result) return result
  
  return null
}

export async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}
