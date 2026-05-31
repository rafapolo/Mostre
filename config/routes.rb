if Rails.env.development?
  require "sidekiq/web"
  Sidekiq::Web.use Rack::Auth::Basic do |u, p|
    u == "admin" && p == "admin"
  end
end

Rails.application.routes.draw do
  mount Sidekiq::Web => "/sidekiq" if Rails.env.development?

  scope "/cultura" do
    get "/", to: "cultura#index"
    post "/inscrever", to: "cultura#inscrever"
    resources :incentivos
    resources :entidades
    resources :projetos
    get "/cidades/:uf/:nome", to: "cultura#cidade"
    get "/proponentes", to: "entidades#proponentes"
    get "/patrocinadores", to: "entidades#patrocinadores"
    get "/salicnet/:numero", to: "cultura#salicnet"
  end
  get "visu.json", to: "cultura#visu"

  scope "/educacao" do
    get "/", to: "educacao#index"
    resources :cursos
    resources :mantenedoras
    resources :instituicaos
  end

  scope "/eleicoes" do
    get "/", to: "eleicoes#index"
    resources :doadores, only: [:index, :show]
    resources :candidatos, only: [:index, :show]
  end

  get "/links/stats", to: "links#stats"
  get "/links/info/:link", to: "links#info"
  resources :links
  get "/:link", to: "links#show"

  root to: "cultura#root"
end
