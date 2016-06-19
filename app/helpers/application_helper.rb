module ApplicationHelper

	def highlight(termo, txt)
		txt.gsub(Regexp.new("(#{termo})", Regexp::IGNORECASE) , '<b class=highlight>\1</b>').html_safe
	end
	alias_method(:hl, :highlight)

	def pagination(collection, options = {})
		options[:renderer] ||= BootstrapPaginationHelper::LinkRenderer
		options[:class] ||= 'pagination pagination-centered'
		options[:inner_window] ||= 2
		options[:outer_window] ||= 1
		will_paginate(collection, options)
	end

	def link_to_image(path)
		 link_to image_tag(path), asset_path(path), target: '_blank'
	end

	def reais valor
		valor.to_i > 0 ? number_to_currency(valor, :unit => "R$") : '-'
	end

	def to_date date
		date.strftime '%Y-%m-%d' if date
	end

	def patrocinadores_path
		link_to "Patrocinadores", "/cultura/patrocinadores"
	end

	def cidade_path c
		"/cultura/cidades/#{c.estado.urlized}/#{c.urlized}"
	end

	def incentivos_path
		link_to "Incentivos", "/cultura/incentivos"
	end

	def projetos_path
		link_to "Projetos", "/cultura/projetos"
	end

	def proponentes_path
		link_to "Proponentes", "/cultura/proponentes"
	end

	def link_to_entidade entidade
		link_to entidade.nome, "/cultura/entidades/#{entidade.to_param}"
	end

	def link_to_projeto projeto
		link_to projeto.nome, "/cultura/projetos/#{projeto.to_param}"
	end

	def especial projeto
		projeto.mecanismo=='FNC' || projeto.enquadramento=='Fundo Nacional de Cultura' || projeto.mecanismo=='Recurso do Tesouro'
	end

	def link_to_mostre(link, info=false)
		para = info ? "/links/info/#{link.atalho}" : link.para
		link_to link.titulo, para
	end

	def pontua_numero num
		number_with_delimiter(num, delimiter: ".")
	end

	def ago date
		words = time_ago_in_words(date)
		words.gsub!("almost", "quase")
		words.gsub!("over", "quase")
		words.gsub!("years", "anos")
		words.gsub!("year", "ano")
		words.gsub!("days", "dias")
		words.gsub!("dia", "dia")
		words.gsub!("hour", "hora")
		words.gsub!("hours", "horas")
		words.gsub!("minute", "minuto")
		words.gsub!("minutes", "minutos")
		words.gsub!("second", "segundo")
		words.gsub!("seconds", "segundos")
		words.gsub!("now", "agora")
		words.gsub!("about", "aprox.")
		words.gsub!("months", "meses")
		words.gsub!("month", "mês")
		"há #{words}"
	end

 	# todo: refinar
	  def url_encode(value, key = nil, out_hash = {})
	    case value
	    when Hash then
	      value.each do |root_key,key|
	      	append_key(key,k)
	      	apk = root_key.nil? ? :"#{key}" : :"#{root_key}[#{key.to_s}]"
	      	encode(key, apk, out_hash)
	      end
	      out_hash
	    when Array then
	      value.each { |v| encode(v, "#{key}[]", out_hash) }
	      out_hash
	    when nil then ''
	    else
	      out_hash[key] = value
	      out_hash
	    end
	  end

end
