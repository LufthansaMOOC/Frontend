/*=======================================================================
 * $Id: listview.js 98065 2017-05-11 15:06:51Z michael.biebl $
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

Mindbreeze.define("component!listview", ["client/views/list", "client/template", "underscore"], function (ListView, Template, _) {

    var ListViewTemplate = Template.extend({
        createView: function(options)  {

          options = _.extend(
            this.attributeModel.getCamelCase(),
            options,
            {
              elementTemplate: this.node.children[0].template
            }
          );

          delete options.node;

          return Template.prototype.createView.apply(this, [options]);
        },

        getContentSchema: function() {
          return  {
            type: "template"
          };
        },

        hasContent: function () {
          return true;
        }
    });

    ListViewTemplate.View = ListView.extend({

        createEntryView: function (options) {
          if (this.options.createEntryViewAction && 
            this.options.application[this.options.createEntryViewAction]) {
            return this.options.application[this.options.createEntryViewAction].call(this.options.application, this.options.application, this, options);						
          }

          options = _.clone(options);
          options.application = this.options.application;

          return this.options.elementTemplate.createView(options);
        }
    }); 

    return ListViewTemplate;
});
