Rails.application.routes.draw do
  root to: 'pages#root'
  resources :posts, only: [:show]
end
