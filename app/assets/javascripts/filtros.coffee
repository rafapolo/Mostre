window.first = true
window.onpopstate = ->
	# evitar primeiro pop
	if window.first
		window.first = false
		return false
	$('#meio').load document.location.href, -> applyTriggers()

carrega = (url) ->
	nova_url = location.pathname + url
	$('#meio').load nova_url, -> applyTriggers()

reorder = (id) -> carrega addStep('ordem', id)

addStep = (nome, val) ->
	url_params['page'] = 1 # volta
	url_params[nome] = val
	delete url_params[nome] unless val
	nova_url = '?' + $.param(url_params)
	history.pushState(url_params, '', nova_url)
	carrega nova_url
	return nova_url

applyTriggers = ->
	$('.reorder').each ->
		$(this).addClass('hover').css('background-color', 'rgb(54,53,49)') if $(this).attr('id') == get_param('ordem')
		$(this).click -> reorder $(this).attr('id')

	$('#filtro_estados').empty()
	$('#filtro_estados').append($('#subfiltros'))
	$('#subfiltros').slideDown(800)

	$('.selectable').on 'click', ->
		type = $(this).attr('type')
		is_estado = ( type == "estado" )

		# desativar filtro area/estado
		if $(this).attr('filtering')=='1'
			$(this).removeAttr('filtering')
			$(this).hide(800, -> $(this).remove())
			$("##{type}s").slideDown(800)
			carrega addStep("#{type}_id", false)
			return false

		# ativar filtro
		id = $(this).attr('id')
		badge = $("##{id}>.badge")
		return false if badge.text()=="0" # nao mostra por entidade vazia

		icon = is_estado ? 'globe' : 'tags'
		addStep("#{type}_id", $(this).attr('type_id'))

		$(this).prepend $("<i class='icon-#{icon}'></i>")
		$(this).attr('filtering', 1)

		$(this)
			.css('top', $(this).offset().top)
			.css('left', $(this).offset().left)
			.css('position', 'absolute')
			# animar pra cima
			.animate(
				top: $("#subsub").offset().top + $("#subsub").height(), 1000, ->
					# pós effect
					$(this).appendTo("#subsub")
					$(this).css('top', '')
					$(this).css('left', '')
					$(this).css('position', 'relative')
					$(badge).text('X').removeClass('badge-info')
					applyTriggers() # reconfigure clickable filter-badge
			)


addCheckFilter = (ids) ->
	$(ids).each (num, id) ->
		bit = if url_params[id] && url_params[id] == 'true' then 'true' else 'false'
		$("##{id}").attr('checked', true) if bit=='true'
		$("##{id}").click -> addStep(id, $(this).is(':checked'))

$ ->
	# fixed checkbox filters
	addCheckFilter ['liberados', 'providencia', 'fnc', 'recurso_tesouro', 'apoiado_maior_aprovado', 'apoiado_maior_zero', 'apoiadores_maior_20']

	# impede form submit
	form = $('#filtros>form')[0]
	$(form).submit ->
		addStep('nome', $('#nome').val())
		addStep('sintese', $('#sintese').val())
		addStep('providencia', $('#providencia').val())
		false

	$('#nome').enterKey -> $(form).submit()
	$('#sintese').enterKey -> $(form).submit()
	$('#providencia').enterKey -> $(form).submit()

	applyTriggers()
