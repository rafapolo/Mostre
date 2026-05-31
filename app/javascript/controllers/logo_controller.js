import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.element.addEventListener("click", () => {
      location.href = this.element.dataset.logoPath || "/cultura"
    })
  }
}
