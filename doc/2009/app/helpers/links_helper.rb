module LinksHelper

  def mostre_path(link)
    "<a href='/#{link.atalho}'>#{link.titulo}</a>"
  end

  def link_path(link, titulo=false)
    href = "/info/#{link.atalho}"
    label = titulo ? link.titulo : link.para
    "<a href='#{href}'>#{label}</a>"
  end

  def search_twitter(link)
    info_url = CGI.escape("http://mostre.me/info/"+link.atalho)
    atalho_url = CGI.escape("http://mostre.me/"+link.atalho)
    JSON.parse(
      open("http://search.twitter.com/search.json?q=#{info_url}+OR+#{atalho_url}").read
      )['results']
  end

  def graph(links)
    Gchart.bar(
      :data => [[50, 0, 0, 0, 0], [0, 50, 0, 0, 0],[0, 0, 50, 0, 0], [0, 0, 0, 25, 0], [0, 0, 0, 0, 42]],
      :encoding => 'extended',
      :bar_colors => 'FFFFFF,CCCCCC,00FF00,0000FF,FF0000',
      :axis_with_labels => 'x',
      :legend => [ ['999999999999999999999999999999999'],['999999999999999999999999999999999'],['999999999999999999999999999999999'],['999999999999999999999999999999999'],['999999999999999999999999999999999']],
      :axis_labels =>[['0','10','20', '30', 50]],
      :bg => 'EFF7FF',
      :size => '250x350',
      :custom => 'chdlp=b',
      :format => 'image_tag'
    )
  end

  # options
  # :start_date, sets the time to measure against, defaults to now
  # :later, changes the adjective and measures time forward
  # :round, sets the unit of measure 1 = seconds, 2 = minutes, 3 hours, 4 days, 5 weeks, 6 months, 7 years (yuck!)
  # :max_seconds, sets the maximimum practical number of seconds before just referring to the actual time
  # :date_format, used with <tt>to_formatted_s<tt>
  def time_ago(original, options = {})
    start_date = options.delete(:start_date) || Time.now
    round = options.delete(:round) || 7
    max_seconds = options.delete(:max_seconds) || 32556926

    chunks = [
      [60 * 60 * 24 * 365 , "ano"],
      [60 * 60 * 24 * 30 , "mês"],
      [60 * 60 * 24 * 7, "semana"],
      [60 * 60 * 24 , "dia"],
      [60 * 60 , "hora"],
      [60 , "minuto"],
      [1 , "segundo"]
    ]

    since = start_date.to_i - original.to_i
    time = []

    if since < max_seconds
      # Loop trough all the chunks
      totaltime = 0

      for chunk in chunks[0..round-2]
        seconds    = chunk[0]
        name       = chunk[1]
        count = ((since - totaltime) / seconds).floor
        time << pluralize(count, name) unless count == 0
        totaltime += count * seconds
      end

      if time.empty?
        "segundos"
      else
        time.join(" ")
      end

    end
  end

end
