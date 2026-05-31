import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.highlightActive()
  }

  highlightActive() {
    const currentPath = location.pathname
    this.element.querySelectorAll(".list-group-item").forEach(a => {
      if (a.getAttribute("href") === currentPath) {
        a.classList.add("active")
      }
    })
  }
}
