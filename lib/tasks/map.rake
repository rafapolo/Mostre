#encoding: utf-8
namespace :map do
  desc "Gerar KML"
  task :kml => :environment do
	def icon i
	    image = 0
	    case i.categoria
	      when "Privada sem fins lucrativos"
	        image = 1
	      when "Privada com fins lucrativos"
	        image = 2
	      when "Pública Federal"
	        image = 3
	      when "Pública Estadual"
	        image = 4
	      when "Especial "
	        image = 5
	      when "Pública Municipal"
	        image = 6
	    end
	    "/assets/maps/#{image}.png"
	  end

  overlay = Kamel::Overlay.new
	overlay.name = 'Instituições de Ensino Superior do Brasil'
	query = Instituicao.joins(:endereco).where('enderecos.latitude')
	count = query.count
	x = 0
	query.each do |i|
		address = i.endereco
		#if lat=address.latitude && lng=address.longitude
			overlay.placemark!(
					:name        => i.nome,
					:description => "instituicao/#{i.urlized}",
					:location    => {:lng => address.longitude, :lat => address.latitude},
					:icon        => icon(i)
				  )
			printf("\rProgresso: %d%", 100*(x+=1)/count)
		#end
	end
	kml = overlay.to_kml.gsub('-style', 'style').gsub('http://earth.google.com/kml/2.1', 'http://www.opengis.net/kml/2.2')
	File.open('public/mapa.kml','w') do |f| f.write(kml) end
	puts
  end

end
