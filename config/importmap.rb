# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "@hotwired--turbo-rails.js" # @8.0.23
pin "@hotwired/turbo", to: "@hotwired--turbo.js" # @8.0.23
pin "@hotwired/stimulus", to: "@hotwired--stimulus.js" # @3.2.2

pin "controllers/application"
pin "controllers/nav_controller"
pin "controllers/logo_controller"
pin "controllers", to: "controllers/index.js"
pin "filtros"
pin "grafo"
