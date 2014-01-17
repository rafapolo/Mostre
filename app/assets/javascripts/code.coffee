$(document).ready ->
	
	$('.logo').click -> location.href = ('/')
	$(document).ajaxStart -> $(".loading").fadeIn 250
	$(document).ajaxComplete -> $(".loading").fadeOut 250

	selected = $("li>a[href='#{location.pathname}']")[0]
	$(selected).parent().addClass('active')
	