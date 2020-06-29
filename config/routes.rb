Rails.application.routes.draw do
  root to: 'pages#root'
  get '/me/' => 'pages#me'
  resources :posts, only: [:show]
end
