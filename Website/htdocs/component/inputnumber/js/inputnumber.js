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

define(
		[ "api/v2/common", "underscore", "component!base", "component!searchform", "client/template",
				"client/templateregistry", "utils/dom", "jquery", "i18n/i18n", "moment"],
		function(Common, _, Base, SearchFormTemplate, Template, TemplateRegistry, dom, $, i18n, moment) {

			var InputNumberTemplate = Template.extend({
			});

			
			var InputNumberView = SearchFormTemplate.ComponentView.extend({

			  initialize : function() {
				  var that = this;
				  SearchFormTemplate.ComponentView.prototype.initialize.apply(this, arguments);

				  this.cmpType = "GE" ;
				  if (this.el.getAttribute("data-range")) {
					switch (this.el.getAttribute("data-range").toLowerCase()) {
						case "from": this.cmpType = "GE"; break;
						case "to": this.cmpType = "LE"; break;		
				    }
			  	}

			  	this.$el.data("queryexpr", _.bind(this.queryexpr, this));

			  },
			  
			  queryexpr: function(value) {
			  		if (value !== undefined) {
			  			if (value == null) {
			  				//$(e.target).val("");
			  			}
			  			else {
			  				//$(e.target).val(value.description);
			  			}
			  			// apply the value to the expr			  			
			  			return;
			  		}
			  		else {
				  		var text = $(this.el).val();
							var numberValue = parseInt(text);
					  	if (!isNaN(numberValue)) {
					  		//  	this.setQuery(this.el, inputText, numberValue, this.cmpType, triggerchange !== false);		
								return {
	                "description": text,
	                "num" : numberValue,
	                "cmp" : this.cmpType
	            	};
					  	}
					  	return null;
				  	}
			  },

		
			});

			InputNumberTemplate.View = InputNumberView;

			return InputNumberTemplate;
		});
