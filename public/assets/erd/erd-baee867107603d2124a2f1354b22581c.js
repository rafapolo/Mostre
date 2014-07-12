(function() {
  var ERD,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ERD = (function() {
    function ERD(name, elem, edges) {
      var model, models, _i, _len;
      this.name = name;
      this.elem = elem;
      this.edges = edges;
      this.handle_close_migration_click = __bind(this.handle_close_migration_click, this);
      this.handle_open_migration_click = __bind(this.handle_open_migration_click, this);
      this.handle_new_model_add_column_click = __bind(this.handle_new_model_add_column_click, this);
      this.handle_remove_model_click = __bind(this.handle_remove_model_click, this);
      this.handle_text_elem_click = __bind(this.handle_text_elem_click, this);
      this.handle_cancel_click = __bind(this.handle_cancel_click, this);
      this.handle_add_column_click = __bind(this.handle_add_column_click, this);
      this.handle_rename_model = __bind(this.handle_rename_model, this);
      this.handle_rename_column = __bind(this.handle_rename_column, this);
      this.handle_change_column_type = __bind(this.handle_change_column_type, this);
      this.handle_add_column = __bind(this.handle_add_column, this);
      this.handle_save = __bind(this.handle_save, this);
      this.handle_drag = __bind(this.handle_drag, this);
      this.connect_arrows = __bind(this.connect_arrows, this);
      this.paper = Raphael(name, this.elem.data('svg_width'), this.elem.data('svg_height'));
      this.setup_handlers();
      models = this.elem.find('.model');
      this.models = {};
      for (_i = 0, _len = models.length; _i < _len; _i++) {
        model = models[_i];
        this.models[$(model).data('model_name')] = model;
      }
      this.connect_arrows(this.edges);
    }

    ERD.prototype.upsert_change = function(action, model, column, from, to) {
      var existing, rows, tr;
      rows = (function() {
        var _i, _len, _ref, _results;
        _ref = $('#changes > tbody > tr');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          tr = _ref[_i];
          _results.push($(tr).find('td'));
        }
        return _results;
      })();
      existing = null;
      $(rows).each(function(i, row) {
        if ((action === $(row[0]).html()) && (model === $(row[1]).html()) && (column === $(row[2]).html())) {
          return existing = row;
        }
      });
      if (existing === null) {
        $('#changes > tbody').append("<tr>\n  <td data-name=\"action\">" + action + "</td>\n  <td data-name=\"model\">" + model + "</td>\n  <td data-name=\"column\">" + column + "</td>\n  <td data-name=\"from\">" + from + "</td>\n  <td data-name=\"to\">" + to + "</td>\n</tr>");
      } else {
        $(existing[3]).text(from);
        $(existing[4]).text(to);
      }
      return $('#changes').show();
    };

    ERD.prototype.positions = function(div) {
      var height, left, top, width, _ref;
      _ref = [parseFloat(div.css('left')), parseFloat(div.css('width')), parseFloat(div.css('top')), parseFloat(div.css('height'))], left = _ref[0], width = _ref[1], top = _ref[2], height = _ref[3];
      return {
        left: left,
        right: left + width,
        top: top,
        bottom: top + height,
        center: {
          x: (left + left + width) / 2,
          y: (top + top + height) / 2
        },
        vertex: {}
      };
    };

    ERD.prototype.connect_arrows = function(edges) {
      return $.each(edges, (function(_this) {
        return function(i, edge) {
          return _this.connect_arrow(edge, $(_this.models[edge.from]), $(_this.models[edge.to]));
        };
      })(this));
    };

    ERD.prototype.connect_arrow = function(edge, from_elem, to_elem) {
      var a, b, from, path, rect, to, x2y, y2x, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
      if (from_elem.attr('id') === to_elem.attr('id')) {
        return;
      }
      if (edge.path != null) {
        edge.path.remove();
      }
      from = this.positions(from_elem);
      to = this.positions(to_elem);
      a = (to.center.y - from.center.y) / (to.center.x - from.center.x);
      b = from.center.y - from.center.x * a;
      x2y = function(x) {
        return a * x + b;
      };
      y2x = function(y) {
        return (y - b) / a;
      };
      if (from.center.x > to.center.x) {
        _ref = [from.left, x2y(from.left)], from.vertex.x = _ref[0], from.vertex.y = _ref[1];
        _ref1 = [to.right, x2y(to.right)], to.vertex.x = _ref1[0], to.vertex.y = _ref1[1];
      } else {
        _ref2 = [from.right, x2y(from.right)], from.vertex.x = _ref2[0], from.vertex.y = _ref2[1];
        _ref3 = [to.left, x2y(to.left)], to.vertex.x = _ref3[0], to.vertex.y = _ref3[1];
      }
      _ref4 = [from, to];
      for (_i = 0, _len = _ref4.length; _i < _len; _i++) {
        rect = _ref4[_i];
        if (rect.vertex.y < rect.top) {
          _ref5 = [y2x(rect.top), rect.top, 'v'], rect.vertex.x = _ref5[0], rect.vertex.y = _ref5[1], rect.vertex.direction = _ref5[2];
        } else if (rect.vertex.y > rect.bottom) {
          _ref6 = [y2x(rect.bottom), rect.bottom, 'v'], rect.vertex.x = _ref6[0], rect.vertex.y = _ref6[1], rect.vertex.direction = _ref6[2];
        } else {
          from.vertex.direction = 'h';
        }
      }
      if (from.vertex.direction === 'h') {
        path = "M" + (Math.floor(from.vertex.x)) + " " + (Math.floor(from.vertex.y)) + "H" + (Math.floor((from.vertex.x + to.vertex.x) / 2)) + " V" + (Math.floor(to.vertex.y)) + " H" + (Math.floor(to.vertex.x));
      } else {
        path = "M" + (Math.floor(from.vertex.x)) + " " + (Math.floor(from.vertex.y)) + "V" + (Math.floor((from.vertex.y + to.vertex.y) / 2)) + " H" + (Math.floor(to.vertex.x)) + " V" + (Math.floor(to.vertex.y));
      }
      return edge.path = this.paper.path(path).attr({
        'stroke-width': 2,
        opacity: 0.5,
        'arrow-end': 'classic-wide-long'
      });
    };

    ERD.prototype.setup_handlers = function() {
      this.setup_click_handlers();
      this.setup_submit_handlers();
      this.setup_migration_event_handlers();
      return $('div.model').draggable({
        drag: this.handle_drag
      });
    };

    ERD.prototype.handle_drag = function(ev, ui) {
      var from, model_name, target, to;
      target = $(ev.target);
      target.addClass('noclick');
      model_name = target.data('model_name');
      from = target.data('original_position');
      to = [target.css('left').replace(/px$/, ''), target.css('top').replace(/px$/, '')].join();
      this.upsert_change('move', model_name, '', '', to);
      return this.connect_arrows(this.edges.filter(function(e) {
        return e.from === model_name || e.to === model_name;
      }));
    };

    ERD.prototype.setup_click_handlers = function() {
      $('div.model_name_text, span.column_name_text, span.column_type_text').on('click', this.handle_text_elem_click);
      $('div.model a.add_column').on('click', this.handle_add_column_click);
      $('div.model a.cancel').on('click', this.handle_cancel_click);
      $('div.model a.close').on('click', this.handle_remove_model_click);
      $('#new_model_add_column').on('click', this.handle_new_model_add_column_click);
      $('div.model a.cancel').on('click', this.handle_cancel_click);
      $('div#open_migration').on('click', this.handle_open_migration_click);
      return $('div#close_migration').on('click', this.handle_close_migration_click);
    };

    ERD.prototype.setup_submit_handlers = function() {
      $('form.rename_model_form').on('submit', this.handle_rename_model);
      $('form.rename_column_form').on('submit', this.handle_rename_column);
      $('form.alter_column_form').on('submit', this.handle_change_column_type);
      $('form.add_column_form').on('submit', this.handle_add_column);
      return $('#changes_form').on('submit', this.handle_save);
    };

    ERD.prototype.setup_migration_event_handlers = function() {
      $('#migration_status tr input').on('click', function() {
        return $(this).parents('tr').toggleClass('active');
      });
      return $('#migration_status thead td button').on('click', function(ev) {
        ev.preventDefault();
        return $('#migration_status').toggleClass('show_all_migrations');
      });
    };

    ERD.prototype.handle_save = function(ev) {
      var changes;
      changes = $('#changes > tbody > tr').map(function() {
        var change;
        change = {};
        $(this).find('td').each(function() {
          var name, value;
          name = $(this).data('name');
          value = $(this).html();
          return change[name] = value;
        });
        return change;
      }).toArray();
      return $('#changes_form').find('input[name=changes]').val(JSON.stringify(changes));
    };

    ERD.prototype.handle_add_column = function(ev) {
      var li_node, model, name, name_span, target, type, type_span;
      ev.preventDefault();
      target = $(ev.target);
      name = target.find('input[name=name]').val();
      if (name === '') {
        return;
      }
      model = target.find('input[name=model]').val();
      type = target.find('input[name=type]').val();
      this.upsert_change('add_column', model, "" + name + "(" + type + ")", '', '');
      name_span = $("<span/>", {
        "class": 'column_name_text'
      }).append(name);
      type_span = $("<span/>", {
        "class": 'column_type_text unsaved'
      }).append(type);
      li_node = $("<li/>", {
        "class": 'column unsaved'
      }).append(name_span).append("&nbsp;").append(type_span);
      return target.hide().parent().siblings('.columns').find('ul').append(li_node).end().end().find('a.add_column').show();
    };

    ERD.prototype.handle_change_column_type = function(ev) {
      var column, model, target, to, type;
      ev.preventDefault();
      target = $(ev.target);
      to = target.find('input[name=to]').val();
      if (to === '') {
        return;
      }
      model = target.find('input[name=model]').val();
      column = target.find('input[name=column]').val();
      type = target.find('input[name=type]').val();
      if (to !== type) {
        this.upsert_change('alter_column', model, column, type, to);
      }
      return target.hide().siblings('.column_type_text').text(to).show().addClass('unsaved').parents('.column').addClass('unsaved');
    };

    ERD.prototype.handle_rename_column = function(ev) {
      var column, model, target, to;
      ev.preventDefault();
      target = $(ev.target);
      to = target.find('input[name=to]').val();
      if (to === '') {
        return;
      }
      model = target.find('input[name=model]').val();
      column = target.find('input[name=column]').val();
      if (to !== column) {
        this.upsert_change('rename_column', model, column, column, to);
      }
      return target.hide().siblings('.column_name_text').text(to).show().parents('.column').addClass('unsaved');
    };

    ERD.prototype.handle_rename_model = function(ev) {
      var model, target, to;
      ev.preventDefault();
      target = $(ev.target);
      to = target.find('input[name=to]').val();
      if (to === '') {
        return;
      }
      model = target.find('input[name=model]').val();
      if (to !== model) {
        this.upsert_change('rename_model', model, '', model, to);
      }
      return target.hide().siblings('.model_name_text').text(to).show().addClass('unsaved');
    };

    ERD.prototype.handle_add_column_click = function(ev) {
      var m, target;
      ev.preventDefault();
      target = $(ev.currentTarget);
      m = target.parents('div.model');
      if (m.hasClass('noclick')) {
        m.removeClass('noclick');
        return false;
      }
      return target.hide().next('form').show().find('a.cancel').show().end().find('input[name=type]').val('string').end().find('input[name=name]').val('').focus();
    };

    ERD.prototype.handle_cancel_click = function(ev) {
      var m, target;
      ev.preventDefault();
      target = $(ev.currentTarget);
      m = target.parents('div.model');
      if (m.hasClass('noclick')) {
        m.removeClass('noclick');
        return false;
      }
      return target.hide().parent('form').hide().prev('a.add_column, span, div').show();
    };

    ERD.prototype.handle_text_elem_click = function(ev) {
      var m, target, text;
      target = $(ev.currentTarget);
      text = target.text();
      m = target.parents('div.model');
      if (m.hasClass('noclick')) {
        m.removeClass('noclick');
        return false;
      }
      return target.hide().next('form').show().find('a.cancel').show().end().find('input[name=to]').val(text).focus();
    };

    ERD.prototype.handle_remove_model_click = function(ev) {
      var m, model_name, parent, target;
      ev.preventDefault();
      target = $(ev.target);
      parent = target.parent();
      m = target.parents('div.model');
      if (m.hasClass('noclick')) {
        m.removeClass('noclick');
        return false;
      }
      if (!confirm('remove this table?')) {
        return;
      }
      model_name = m.data('model_name');
      window.erd.upsert_change('remove_model', model_name, '', '', '');
      parent.hide();
      $.each(this.edges, (function(_this) {
        return function(i, edge) {
          if ((edge.from === model_name) || (edge.to === model_name)) {
            return _this.edges.splice(i, 1);
          }
        };
      })(this));
      this.paper.clear();
      return this.connect_arrows(this.edges);
    };

    ERD.prototype.handle_new_model_add_column_click = function(ev) {
      var target;
      ev.preventDefault();
      target = $(ev.currentTarget);
      return target.parent().siblings('table').append('<tr><td><input type="text" /></td><td class="separator">:</td><td><input type="text" value="string" /></td></tr>').find('tr:last > td > input:first').focus();
    };

    ERD.prototype.handle_open_migration_click = function(ev) {
      var m, target, text;
      ev.preventDefault();
      target = $(ev.currentTarget);
      text = target.text();
      m = target.parents('div.model');
      if (m.hasClass('noclick')) {
        m.removeClass('noclick');
        return false;
      }
      return target.hide().next('div').show().find('#close_migration').show();
    };

    ERD.prototype.handle_close_migration_click = function(ev) {
      var m, target, text;
      ev.preventDefault();
      target = $(ev.currentTarget);
      text = target.text();
      m = target.parents('div.model');
      if (m.hasClass('noclick')) {
        m.removeClass('noclick');
        return false;
      }
      return target.hide().parent().hide().prev('div').show();
    };

    return ERD;

  })();

  $(function() {
    window.erd = new ERD('erd', $('#erd'), window.raw_edges);
    $('#erd').css('height', window.innerHeight);
    $(window).on('resize', function() {
      return $('#erd').css('height', window.innerHeight);
    });
    $("#open_migration").click(function() {
      return $('#close_migration, #open_create_model_dialog').css('right', $('#migration').width() + ($(this).width() / 2) - 5);
    });
    $("#close_migration").click(function() {
      return $('#open_create_model_dialog').css('right', 15);
    });
    $('#open_up').click(function() {
      $('#migration_status .up').addClass('open');
      return $('#migration_status .down').removeClass('open');
    });
    $('#open_down').click(function() {
      $('#migration_status .down').addClass('open');
      return $('#migration_status .up').removeClass('open');
    });
    $('#close_all').click(function() {
      return $('#migration_status tr').removeClass('open');
    });
    $('#create_model_form').dialog({
      autoOpen: false,
      height: 450,
      width: 450,
      modal: true,
      buttons: {
        'Create Model': function() {
          var columns, model;
          model = $('#new_model_name').val();
          columns = '';
          $('#create_model_table > tbody > tr').each(function(i, row) {
            var name, type, v, _ref;
            _ref = (function() {
              var _i, _len, _ref, _results;
              _ref = $(row).find('input');
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                v = _ref[_i];
                _results.push($(v).val());
              }
              return _results;
            })(), name = _ref[0], type = _ref[1];
            if (name) {
              return columns += "" + name + (type ? ":" + type : '') + " ";
            }
          });
          window.erd.upsert_change('create_model', model, columns, '', '');
          $(this).find('table > tbody > tr').each(function(i, row) {
            if (i >= 1) {
              return row.remove();
            }
          });
          $(this).find('input').val('');
          $(this).find('input[name=new_model_column_type_1]').val('string');
          return $(this).dialog('close');
        },
        Cancel: function() {
          return $(this).dialog('close');
        }
      }
    });
    return $('#open_create_model_dialog').click(function(ev) {
      ev.preventDefault();
      return $('#create_model_form').dialog('open');
    });
  });

}).call(this);
