# Be sure to restart your server when you modify this file

#ENV['RAILS_ENV'] ||= 'production'

# Specifies gem version of Rails to use when vendor/rails is not present
RAILS_GEM_VERSION = '2.3.3' unless defined? RAILS_GEM_VERSION

# Bootstrap the Rails environment, frameworks, and default configuration
require File.join(File.dirname(__FILE__), 'boot')

if ENV['RAILS_ENV'] == 'production'  # don't bother on dev
  ENV['GEM_PATH'] = '/home/rapolo/.gems' #+ ':/usr/lib/ruby/gems/1.8'  # Need this or Passenger fails to start
  #require '/home/USERNAME/.gems/gems/RedCloth-4.1.9/lib/redcloth.rb'  # Need this for EACH LOCAL gem you want to use, otherwise it uses the ones in /usr/lib
end

Date::MONTHNAMES = [nil] + %w(Janeiro Fevereiro Março Abril Maio Junho Julho Agosto Setembro Outubro Novembro Dezembro)
Date::DAYNAMES = %w(Domingo Segunda-Feira Terça-Feira Quart-Feira Quinta-Feira Sexta-Feira Sábado)
Date::ABBR_MONTHNAMES = [nil] + %w(Jan Fev Mar Abr Mai Jun Jul Aug Sep Out Nov Dez)
Date::ABBR_DAYNAMES = %w(Dom Seg Ter Qua Qui Sex Sab)

class Time
  alias :strftime_nolocale :strftime
  def strftime(format)
    format = format.dup
    format.gsub!(/%a/, Date::ABBR_DAYNAMES[self.wday])
    format.gsub!(/%A/, Date::DAYNAMES[self.wday])
    format.gsub!(/%b/, Date::ABBR_MONTHNAMES[self.mon])
    format.gsub!(/%B/, Date::MONTHNAMES[self.mon])
    self.strftime_nolocale(format)
  end
end

Rails::Initializer.run do |config|
  config.i18n.load_path << Dir[File.join(RAILS_ROOT, 'my', 'locales', '*.{rb,yml}')]
  config.gem "googlecharts", :lib => "gchart"

  # Settings in config/environments/* take precedence over those specified here.
  # Application configuration should go into files in config/initializers
  # -- all .rb files in that directory are automatically loaded.

  # Add additional load paths for your own custom dirs
  # config.load_paths += %W( #{RAILS_ROOT}/extras )

  # Specify gems that this application depends on and have them installed with rake gems:install
  # config.gem "bj"
  # config.gem "hpricot", :version => '0.6', :source => "http://code.whytheluckystiff.net"
  # config.gem "sqlite3-ruby", :lib => "sqlite3"
  # config.gem "aws-s3", :lib => "aws/s3"

  # Only load the plugins named here, in the order given (default is alphabetical).
  # :all can be used as a placeholder for all plugins not explicitly named
  # config.plugins = [ :exception_notification, :ssl_requirement, :all ]

  # Skip frameworks you're not going to use. To use Rails without a database,
  # you must remove the Active Record framework.
  # config.frameworks -= [ :active_record, :active_resource, :action_mailer ]

  # Activate observers that should always be running
  # config.active_record.observers = :cacher, :garbage_collector, :forum_observer

  # Set Time.zone default to the specified zone and make Active Record auto-convert to this zone.
  # Run "rake -D time" for a list of tasks for finding time zone names.
  config.time_zone = 'UTC'

  # The default locale is :en and all translations from config/locales/*.rb,yml are auto loaded.
  # config.i18n.load_path += Dir[Rails.root.join('my', 'locales', '*.{rb,yml}')]
  # config.i18n.default_locale = :de
end

#require 'validates_uri_existence_of'
require 'brI18n'
require 'brstring'
require 'extend_string'
require 'uri'
require 'open-uri'
require 'json'