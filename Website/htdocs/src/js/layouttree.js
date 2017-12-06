/*========================================================================
* $Id: layouttree.js 84072 2015-04-29 15:52:03Z michael.biebl $
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

//
// The LayoutTree searches layout templates in the DOM.
//
// *Process*
// 1. build tree
//   var tt = new LayoutTree(rootEl, rootLayoutType);
//
// 2. create views based on template tree
//   tt.initialize(model, callback);
//
// 3. destroy all created views and unregister all event handlers
//   tt.destroy(callback);
//
// *Editor Lifecycle*
//
// Repeat steps 1-3 after each edit
//

define([
  "./templatetree",
  "underscore",
  "jquery"
  ], function(
    TemplateTree,
    _,
    $
) {

  var LayoutTree = function (rootEl, rootTemplateType) {
    this.init.apply(this, arguments);
  };

  _.extend(LayoutTree.prototype, TemplateTree.prototype, {
      matches: function (el) {
        var $el = $(el);
        return TemplateTree.prototype.matches.apply(this, arguments) || $el.hasClass("row-fluid") || $el.hasClass("row") || $el.hasClass("span1") || $el.hasClass("span2") || $el.hasClass("span3") || $el.hasClass("span4") || $el.hasClass("span5") || $el.hasClass("span6") || $el.hasClass("span7") || $el.hasClass("span8") || $el.hasClass("span9") || $el.hasClass("span10") || $el.hasClass("span11") || $el.hasClass("span12") || $el.hasClass("mb-component-container") || $el.is(".mb-component-container a[data-action-object]");
      },

      getType: function (el) {
        var $el = $(el);
        if ($el.hasClass("row-fluid") || $el.hasClass("row")) return "row";
        if ($el.hasClass("span1") || $el.hasClass("span2") || $el.hasClass("span3") || $el.hasClass("span4") || $el.hasClass("span5") || $el.hasClass("span6") || $el.hasClass("span7") || $el.hasClass("span8") || $el.hasClass("span9") || $el.hasClass("span10") || $el.hasClass("span11") || $el.hasClass("span12") || $el.hasClass("mb-component-container")) return "span";
        if ($el.is("a")) return "anchor";

        return TemplateTree.prototype.getType.apply(this, arguments);
      }
  });

  return LayoutTree;
});
