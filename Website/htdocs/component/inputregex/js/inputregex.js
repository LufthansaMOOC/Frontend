/*========================================================================
 * $Id: searchform.js 73821 2013-07-17 11:51:32Z michael.biebl $
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

define([ 
	"api/v2/common", 
	"underscore", 
	"component!base", 
	"component!searchform", 
	"client/template",
	"client/templateregistry", 
	"utils/dom", 
	"jquery", 
	"i18n/i18n"],
	function(
		Common, 
		_, 
		Base, 
		SearchFormTemplate, 
		Template, 
		TemplateRegistry, 
		dom, 
		$, 
		i18n
	){

			var InputRegexTemplate = Template.extend({
			});

			var InputRegexView = SearchFormTemplate.ComponentView
					.extend({

						tagName : "input",


						initialize : function() {
							SearchFormTemplate.ComponentView.prototype.initialize.apply(this, arguments);
							var queryExpr = this.$el.data("queryexpr");
							if (queryExpr && !_.isFunction(queryExpr)) {								
								$(this.el).val(queryExpr.description);													
							}

							this.$el.data("queryexpr", _.bind(this.setQuery, this));
						},
						
						setQuery : function(element) {
						  var value = $(this.el).val();
						  var id = $(this.el).attr("name");

						  if ( value.length == 0 ) return null; 

							return {
                "description": value,
                "id" : id,
                "label": id,
                "regex": ".*\\Q" + value + "\\E.*"
            	};
						}
					});

			InputRegexTemplate.View = InputRegexView;

			return InputRegexTemplate;
		});
