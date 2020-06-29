ActionController::Renderers.add :turbo do |obj, options|
  self.headers['X-Turbolinks-Frame'] = obj.to_turbo.id
  body = render_to_string(obj, { layout: false }.reverse_merge(options))
  self.response_body = "<turbolinks-frame id='#{obj.to_turbo.id}'>#{body}</turbolinks-frame>"
end
