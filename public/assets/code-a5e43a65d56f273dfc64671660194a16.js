(function() {
  $(document).ready(function() {
    var selected;
    $('.logo').click(function() {
      return location.href = '/cultura';
    });
    $(document).ajaxStart(function() {
      return $(".loading").fadeIn(250);
    });
    $(document).ajaxComplete(function() {
      return $(".loading").fadeOut(250);
    });
    selected = $("li>a[href='" + location.pathname + "']")[0];
    return $(selected).parent().addClass('active');
  });

}).call(this);
