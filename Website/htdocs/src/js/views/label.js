/*========================================================================
* $Id: label.js 75495 2013-10-02 13:13:25Z michael.biebl $
*
* Copyright © Mindbreeze Software GmbH, Linz, Austria, 2005-2013
*
* Der Nutzer des Computerprogramms anerkennt, dass der oben stehende
* Copyright-Vermerk im Sinn des Welturheberrechtsabkommens an der vom
* Urheber festgelegten Stelle in der Funktion des Computerprogramms
* angebracht bleibt, um den Vorbehalt des Urheberrechtes genuegend zum
* Ausdruck zu bringen. Dieser Urheberrechtsvermerk darf weder vom Kunden,
* Nutzer und/oder von Dritten entfernt, veraendert oder disloziert werden.
* =========================================================================*/


/**
* A View for displaying lists.
*/
define([
    "component!base"
  ], function(
    Base
  ) {

  var LabelView = Base.extend({

    render: function () {
      var value = this.model && this.model.get("label");

      this.el.innerHTML = value || '';

      return this;
    }

  });

  return LabelView;
});
