/*========================================================================
 * $Id: include.js 83181 2015-02-23 20:30:05Z michael.biebl $
 *
 * Copyright © Mindbreeze Software GmbH, Linz, Austria, 2005-2015
 *
 * Der Nutzer des Computerprogramms anerkennt, dass der oben stehende
 * Copyright-Vermerk im Sinn des Welturheberrechtsabkommens an der vom
 * Urheber festgelegten Stelle in der Funktion des Computerprogramms
 * angebracht bleibt, um den Vorbehalt des Urheberrechtes genuegend zum
 * Ausdruck zu bringen. Dieser Urheberrechtsvermerk darf weder vom Kunden,
 * Nutzer und/oder von Dritten entfernt, veraendert oder disloziert werden.
 * =========================================================================*/

 
define([
  "client/template",
  "component!base",
  "utils/mustache",
  "backbone",
  "text!../html/content.html",
  "component!view",
  "jquery"
], function(
  Template,
  Base,
  MustacheTemplate,
  Backbone,
  TextHTMLContent,
  ViewTemplate,
  $
) {


 var ExportSearch = ViewTemplate.extend({
   // TODO: Make generic via Include
   innerHTML: function() {
     return TextHTMLContent;
   },

   initialize: function() {
     var $nodeEl = $(this.node.el);
     if (!$nodeEl.html().replace(/\s+/, "") && this.innerHTML()) {
       $($nodeEl).html(this.innerHTML());
       var appendOnTableScroll = this.application.options.appendOnTableScroll || true;
       $(this.node.el).find('[data-template="table"]').attr("data-appendonscroll", appendOnTableScroll);
       this.node.collect();
     }
     Template.prototype.initialize.apply(this, arguments);     
   }
 });

 ExportSearch.View = ExportSearch;
 return ExportSearch;

});

