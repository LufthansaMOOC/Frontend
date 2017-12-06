/*========================================================================
* $Id: tabs.js 86561 2015-09-23 09:26:58Z jakob.praher $
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
    "client/template",
    "client/views/list",
    "underscore",
    "text!../mustache/tasksmonitor.mustache"
  ], function(
    Template,
    ListView,
    _,
    DEFAULT_TEMPLATE
  ) {

    var TasksMonitor = Template.extend({

      model: function () {
        // TODO: use configured one if the option is set
        return this.application.models.tasks;
      },

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

    TasksMonitor.DEFAULT_TEMPLATE = DEFAULT_TEMPLATE;

    TasksMonitor.View = ListView.extend({

      createEntryView: function (options) {
        options = _.clone(options);
        options.elementTemplate = this.options.elementTemplate;
        options.application = this.options.application;
        return ListView.prototype.createEntryView.apply(this, [options]);
      }

    });

    TasksMonitor.View.EntryView = ListView.EntryView.extend({

      initialize: function () {
        ListView.EntryView.prototype.initialize.apply(this, arguments);
        
        this.listenTo(this.model, "change", this.render);
      },

      render: function () {
        this.childView.render();
        return this;
      },

      createChildView: function (options) {
        options = _.extend(
          {
            modelType: "Task"
          },
          options
        );
        return options.elementTemplate.createView(options);
      }

    });

    return TasksMonitor;
});

