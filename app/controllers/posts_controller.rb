class PostsController < ApplicationController
  def show
    post = OpenStruct.new(id: params[:id], to_turbo: OpenStruct.new(id: 'post'), to_partial_path: "posts/post")
    render turbo: post
  end
end
