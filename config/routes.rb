require 'sidekiq/web' if Rails.env.development?

Mostre::Application.routes.draw do

  mount Sidekiq::Web, at: "/sidekiq" if Rails.env.development?

  scope '/cultura' do
    get '', to: "cultura#index"
    post '/inscrever', to: "cultura#inscrever"
    resources :incentivos
    resources :entidades
    resources :projetos
    get "/cidades/:uf/:nome", to: "cultura#cidade"
    get "/proponentes", to: "entidades#proponentes"
    get "/patrocinadores", to: "entidades#patrocinadores"
    get "/salicnet/:numero", to: "cultura#salicnet"
  end
  get 'visu.json', to: "cultura#visu"

  scope '/educacao' do
    get '', to: "educacao#index"
    resources :cursos
    resources :mantenedoras
    resources :instituicaos
    get "/mantenedoras", to: "mantenedoras#index"
    get "/instituicoes", to: "instituicaos#index"
    get "/cursos", to: "cursos#index"
  end

  scope '/eleicoes' do
      get '', to: "eleicoes#index"
      get "/doadores", to: "doadores#index"
      get "/doadores/:id", to: "doadores#show"      
      # get "/partidos", to: "partidos#index"
      # get "/partidos/:partido", to: "partidos#show"
      get "/candidatos", to: "candidatos#index"
      get "/candidatos/:id", to: "candidatos#show"
      #get "/comites", to: "eleicoes#comites"
    end

  get '/links', to: "links#index"
  get '/links/stats', to: "links#stats"
  get '/links/info/:link', to: "links#info"
  get '/:link', to: "links#show"
  resources :links

  root to: 'cultura#root'
end
