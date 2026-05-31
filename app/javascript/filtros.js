var url_params = {}
;(function parseParams() {
  var pl = /\+/g
  var search = /([^&=]+)=?([^&]*)/g
  var decode = function (s) { return decodeURIComponent(s.replace(pl, " ")) }
  var query = window.location.search.substring(1)
  var match
  while ((match = search.exec(query))) {
    url_params[decode(match[1])] = decode(match[2])
  }
})()

function get_param(name) {
  var match = new RegExp("[?|&]" + name + "=" + "([^&;]+?)(&|#|;|$)").exec(location.search)
  return match ? decodeURIComponent(match[1].replace(/\+/g, "%20")) : null
}

window.first = true

window.onpopstate = function () {
  if (window.first) {
    window.first = false
    return false
  }
  loadContent(document.location.href)
}

function loadContent(url) {
  var loading = document.querySelector(".loading")
  if (loading) loading.style.display = "block"
  fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest" } })
    .then(function (r) { return r.text() })
    .then(function (html) {
      document.getElementById("meio").innerHTML = html
      applyTriggers()
      if (loading) loading.style.display = "none"
    })
}

function buildQuery(params) {
  var parts = []
  for (var key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== false) {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]))
    }
  }
  return parts.length ? "?" + parts.join("&") : ""
}

function addStep(name, val) {
  url_params["page"] = 1
  url_params[name] = val
  if (val === false || val === null || val === undefined) delete url_params[name]
  var qs = buildQuery(url_params)
  history.pushState(url_params, "", qs)
  loadContent(window.location.pathname + qs)
  return qs
}

window.reorder = function (id) {
  addStep("ordem", id)
}

function applyTriggers() {
  document.querySelectorAll(".reorder").forEach(function (el) {
    if (el.id === get_param("ordem")) {
      el.classList.add("hover")
      el.style.backgroundColor = "rgb(54,53,49)"
    }
  })

  var filtroEstados = document.getElementById("filtro_estados")
  var subfiltros = document.getElementById("subfiltros")
  if (filtroEstados && subfiltros) {
    filtroEstados.innerHTML = ""
    filtroEstados.appendChild(subfiltros)
    subfiltros.style.display = "block"
  }
}

// Event delegation — listeners added once, work for dynamically loaded content
document.addEventListener("click", function (e) {
  var el = e.target.closest(".selectable")
  if (el) {
    var type = el.getAttribute("type")

    if (el.getAttribute("filtering") === "1") {
      el.removeAttribute("filtering")
      el.style.display = "none"
      var parent = document.getElementById(type + "s")
      if (parent) parent.style.display = "block"
      addStep(type + "_id", false)
      el.parentNode.removeChild(el)
      return
    }

    var badge = el.querySelector(".badge")
    if (badge && badge.textContent === "0") return

    var typeId = el.getAttribute("type_id")
    addStep(type + "_id", typeId)
  }
})

document.addEventListener("click", function (e) {
  var el = e.target.closest(".reorder")
  if (el) {
    reorder(el.id)
  }
})

document.addEventListener("change", function (e) {
  var el = e.target
  var filterIds = ["liberados", "providencia", "fnc", "recurso_tesouro", "apoiado_maior_aprovado", "apoiado_maior_zero", "apoiadores_maior_20"]
  if (el.type === "checkbox" && filterIds.indexOf(el.id) !== -1) {
    addStep(el.id, el.checked)
  }
})

document.addEventListener("submit", function (e) {
  var form = e.target.closest("#filtros > form")
  if (form) {
    e.preventDefault()
    url_params["page"] = 1
    ;["nome", "sintese", "providencia"].forEach(function (id) {
      var el = document.getElementById(id)
      if (el) {
        if (el.value) { url_params[id] = el.value } else { delete url_params[id] }
      }
    })
    var qs = buildQuery(url_params)
    history.pushState(url_params, "", qs)
    loadContent(window.location.pathname + qs)
  }
})

function initFilters() {
  document.querySelectorAll(".selectable").forEach(function (el) {
    var badge = el.querySelector(".badge")
    if (badge && badge.textContent === "0") {
      el.style.cursor = "default"
    }
  })

  document.querySelectorAll(".reorder").forEach(function (el) {
    if (el.id === get_param("ordem")) {
      el.classList.add("hover")
      el.style.backgroundColor = "rgb(54,53,49)"
    }
  })

  document.querySelectorAll('input[type="checkbox"]').forEach(function (el) {
    if (["liberados", "providencia", "fnc", "recurso_tesouro", "apoiado_maior_aprovado", "apoiado_maior_zero", "apoiadores_maior_20"].indexOf(el.id) !== -1) {
      el.checked = url_params[el.id] === "true"
    }
  })

  applyTriggers()
}

document.addEventListener("DOMContentLoaded", initFilters)
document.addEventListener("turbo:load", initFilters)
