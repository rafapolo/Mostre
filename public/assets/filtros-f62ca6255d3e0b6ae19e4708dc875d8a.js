(function() {
  var addCheckFilter, addStep, applyTriggers, carrega, reorder;

  window.first = true;

  window.onpopstate = function() {
    if (window.first) {
      window.first = false;
      return false;
    }
    return $('#meio').load(document.location.href, function() {
      return applyTriggers();
    });
  };

  carrega = function(url) {
    var nova_url;
    nova_url = location.pathname + url;
    return $('#meio').load(nova_url, function() {
      return applyTriggers();
    });
  };

  reorder = function(id) {
    return carrega(addStep('ordem', id));
  };

  addStep = function(nome, val) {
    var nova_url;
    url_params['page'] = 1;
    url_params[nome] = val;
    if (!val) {
      delete url_params[nome];
    }
    nova_url = '?' + $.param(url_params);
    history.pushState(url_params, '', nova_url);
    carrega(nova_url);
    return nova_url;
  };

  applyTriggers = function() {
    $('.reorder').each(function() {
      if ($(this).attr('id') === get_param('ordem')) {
        $(this).addClass('hover').css('background-color', 'rgb(54,53,49)');
      }
      return $(this).click(function() {
        return reorder($(this).attr('id'));
      });
    });
    $('#filtro_estados').empty();
    $('#filtro_estados').append($('#subfiltros'));
    $('#subfiltros').slideDown(800);
    return $('.selectable').on('click', function() {
      var badge, icon, id, is_estado, type;
      type = $(this).attr('type');
      is_estado = type === "estado";
      if ($(this).attr('filtering') === '1') {
        $(this).removeAttr('filtering');
        $(this).hide(800, function() {
          return $(this).remove();
        });
        $("#" + type + "s").slideDown(800);
        carrega(addStep("" + type + "_id", false));
        return false;
      }
      id = $(this).attr('id');
      badge = $("#" + id + ">.badge");
      if (badge.text() === "0") {
        return false;
      }
      icon = is_estado != null ? is_estado : {
        'globe': 'tags'
      };
      addStep("" + type + "_id", $(this).attr('type_id'));
      $(this).prepend($("<i class='icon-" + icon + "'></i>"));
      $(this).attr('filtering', 1);
      return $(this).css('top', $(this).offset().top).css('left', $(this).offset().left).css('position', 'absolute').animate({
        top: $("#subsub").offset().top + $("#subsub").height()
      }, 1000, function() {
        $(this).appendTo("#subsub");
        $(this).css('top', '');
        $(this).css('left', '');
        $(this).css('position', 'relative');
        $(badge).text('X').removeClass('badge-info');
        return applyTriggers();
      });
    });
  };

  addCheckFilter = function(ids) {
    return $(ids).each(function(num, id) {
      var bit;
      bit = url_params[id] && url_params[id] === 'true' ? 'true' : 'false';
      if (bit === 'true') {
        $("#" + id).attr('checked', true);
      }
      return $("#" + id).click(function() {
        return addStep(id, $(this).is(':checked'));
      });
    });
  };

  $(function() {
    var form;
    addCheckFilter(['liberados', 'providencia', 'fnc', 'recurso_tesouro', 'apoiado_maior_aprovado', 'apoiado_maior_zero', 'apoiadores_maior_20']);
    form = $('#filtros>form')[0];
    $(form).submit(function() {
      addStep('nome', $('#nome').val());
      addStep('sintese', $('#sintese').val());
      addStep('providencia', $('#providencia').val());
      return false;
    });
    $('#nome').enterKey(function() {
      return $(form).submit();
    });
    $('#sintese').enterKey(function() {
      return $(form).submit();
    });
    $('#providencia').enterKey(function() {
      return $(form).submit();
    });
    return applyTriggers();
  });

}).call(this);
