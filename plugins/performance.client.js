// Performance optimization plugin
export default defineNuxtPlugin(() => {
  // Preload critical resources
  if (process.client) {
    // Preload critical CSS
    const preloadCSS = (href) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.href = href
      document.head.appendChild(link)
    }

    // Preload critical fonts
    const preloadFont = (href) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.type = 'font/woff2'
      link.href = href
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    }

    // Defer non-critical JavaScript
    const deferScripts = () => {
      const scripts = document.querySelectorAll('script[data-defer]')
      scripts.forEach(script => {
        script.defer = true
      })
    }

    // Optimize images loading
    const optimizeImages = () => {
      const images = document.querySelectorAll('img[data-src]')
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target
            img.src = img.dataset.src
            img.removeAttribute('data-src')
            observer.unobserve(img)
          }
        })
      })

      images.forEach(img => imageObserver.observe(img))
    }

    // Initialize optimizations when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        deferScripts()
        optimizeImages()
      })
    } else {
      deferScripts()
      optimizeImages()
    }

    // Remove unused CSS
    const removeUnusedCSS = () => {
      // This would typically be handled by a build tool like PurgeCSS
      // But we can add basic cleanup here
      const unusedStyles = document.querySelectorAll('style[data-unused]')
      unusedStyles.forEach(style => style.remove())
    }

    // Clean up after page load
    window.addEventListener('load', () => {
      removeUnusedCSS()
    })
  }
})
