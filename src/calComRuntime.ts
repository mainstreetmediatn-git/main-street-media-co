const CAL_COM_BOOKING_URL = "https://cal.com/main-street-media-co-jfgesg"

function applyCalComIntegration(root: ParentNode = document) {
  root.querySelectorAll<HTMLAnchorElement>('a[href*="calendly.com"]').forEach((link) => {
    link.href = CAL_COM_BOOKING_URL
    link.target = "_blank"
    link.rel = "noreferrer"
  })

  root.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]').forEach((link) => {
    link.remove()
  })

  root.querySelectorAll<HTMLElement>(".msm-form-note").forEach((note) => {
    note.innerHTML = '<strong>Manual delivery fallback:</strong><span>Email <a href="mailto:mainstreetmediatn@gmail.com">mainstreetmediatn@gmail.com</a> or <a href="https://cal.com/main-street-media-co-jfgesg" target="_blank" rel="noreferrer">book a call through Cal.com</a>.</span>'
  })

  root.querySelectorAll<HTMLElement>(".msm-form-success p").forEach((paragraph) => {
    if (paragraph.textContent?.includes("949-447-4490")) {
      paragraph.innerHTML = 'Your audit request has been prepared. Until automated delivery is connected, please email <a href="mailto:mainstreetmediatn@gmail.com">mainstreetmediatn@gmail.com</a> or <a href="https://cal.com/main-street-media-co-jfgesg" target="_blank" rel="noreferrer">book a call through Cal.com</a>.'
    }
  })
}

applyCalComIntegration()

const observer = new MutationObserver(() => applyCalComIntegration())
observer.observe(document.documentElement, { childList: true, subtree: true })
