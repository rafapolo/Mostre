Mostre::Application.routes.draw do
  
  resources :projetos
  resources :entidades
  resources :patrocinadors

  scope '/cultura' do
    get '', to: "pages#index"
    resources :incentivos
    resources :entidades
    resources :projetos    
    get "/cidades/:uf/:nome", to: "pages#cidade"
    get "/proponentes", to: "entidades#proponentes"
    get "/patrocinadores", to: "entidades#patrocinadores"
    get "/salicnet/:numero", to: "pages#salicnet"
  end
  
  get 'visu.json', to: "pages#visu"    
  get '/entidades/grafo/:id.json', to: "graphs#entidade"

  get '/links', to: "links#index"
  get '/links/stats', to: "links#stats"
  get '/links/info/:link', to: "links#info"
  get '/:link', to: "links#show"
    
  # antigo
  resources :links
  root to: 'links#index' #redirect('/cultura')

end
