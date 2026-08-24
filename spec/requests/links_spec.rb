require 'rails_helper'

RSpec.describe "Links", type: :request do
  it "GET /links renders the index" do
    get "/links"
    expect(response).to have_http_status(:success)
  end

  it "GET /links/stats renders the stats page" do
    get "/links/stats"
    expect(response).to have_http_status(:success)
  end

  it "GET /:atalho redirects to the target url and logs a click" do
    link = links(:link_valido)
    expect {
      get "/#{link.atalho}", headers: { "HTTP_REFERER" => "https://example.com" }
    }.to change(Click, :count).by(1)
    expect(response).to redirect_to(link.para)
  end

  it "GET /:atalho redirects to /links when the shortcut doesn't exist" do
    get "/does-not-exist"
    expect(response).to redirect_to("/links")
  end
end
