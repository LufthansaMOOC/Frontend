/*========================================================================
* $Id: view.js 99278 2017-06-23 11:17:03Z daniel.eppensteiner $
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
     "i18n/i18n",
     "component!base",
     "component!results",
     "component!searchform",
     "client/template",
     "utils/jsonpath",
     "jquery",
     "underscore"
   ], function(
     i18n,
     Base,
     ResultsTemplate,
     SearchFormTemplate,
     Template,
     JSONPath,
     $,
     _
   ) {

   var ViewTemplate = Template.extend({
     type: "view",
     editableName: "editor_result_group_searchsettings",

     schema: new Template.Schema({
       inputAttributes: {
         constraint: {
           path: "source_context.constraints.view_base",
           type: "QueryExpr",
           title: "editor_result_constraint"
         },
         count: {
           type: "int",
           title: "editor_result_count",
           values:  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
           defaultValue: 5
         },
         orderby: {
           type: "string",
           title: "client_toolbar_sortingalgorithm_label",
           values: {
             bind: {
               options:  "orderable",
               value:    "name",
               text:    "localized_name"
             }
           }
         },
         order_direction: {
           type: "string",
           title: "order_direction",
           values:  [
             { value: "ASCENDING", text: i18n("sort_ascending") },
             { value: "DESCENDING", text: i18n("sort_descending") }
           ]
         },
         "queryspelling-upto-results": {
           path: "alternatives_query_spelling_max_estimated_count",
           type: "int",
           title: "editor_alternatives_query_spelling_max_estimated_count",
           // values:  [0, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
           defaultValue: 0,
           visible: false
         }
       }
   }),

   hasContent: function() { return false; },

   createView: function(options)  {
       var model = options.model;

       var templateInput = options.node.template.getInput();

       var profileSettingsModel = this.application && this.application.models.profileSettings
       if (profileSettingsModel && profileSettingsModel.at(0) && profileSettingsModel.at(0).get("data").settings.results_per_page) {
         delete templateInput.count;
       }

       this.setInput(model, templateInput);

       options = _.extend({}, options, {
         template: this,
         model: model,
         el: this.el
       });

       _.forEach(options.node.children, function (childNode) {
         var view = childNode.template.createView({
           application: options.application,
           model: model,
           node: childNode
         });

         if (view.el !== childNode.template.el) {
           $(childNode.template.el).after(view.el);
         }
       });

       var view = new View(options);
       this.instances.push(view);
       return view;
     },

     setInput: function (model, input) {
       _.each(input, function (value, path) {
         var pathElts  = JSONPath.parsePath(path),
             theModel = model;

         if (pathElts.length > 1) {
           theModel = model.submodel(pathElts.slice(0, -1).join("."));
           path = pathElts[pathElts.length - 1];
         }

         theModel.set(path, value);
       });
     }
  });

  var View = Base.extend({

    setEditable: function () {
    },

    remove: function () {
      this.stopListening();
      this.undelegateEvents();
      return this;
    }
  });

  return ViewTemplate;
});
