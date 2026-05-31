require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Mostre
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.0
    config.time_zone = 'Brasilia'
    config.autoload_lib(ignore: %w[assets tasks crawler])
    config.active_job.queue_adapter = :solid_queue

  end
end
