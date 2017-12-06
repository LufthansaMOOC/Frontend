/*========================================================================
* $Id: breadcrumb.js 85059 2015-07-09 06:07:51Z michael.biebl $
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

/*
* BreadcrumbTemplate
* ==================
*
* A component to display a breadcrumb of constraints.
*
*/

define([
    "i18n/i18n",
    "model/filtered_collection",
    "model/tree_collection",
    "underscore",
    "backbone",
    "client/template",
    "client/views/list"
  ], function(
    i18n,
    FilteredCollection,
    TreeCollection,
    _,
    Backbone,
    Template,
    ListView
  ) {

    var DEFAULT_TEMPLATE = 
      '<script type="text/x-mustache-template" data-tag-name="li"><div><label class="checkbox"><input type="checkbox" checked data-action-object="{ &quot;removeConstraint&quot;: {} }"><span title="{{{description}}}">{{{description}}}</span></label></div></script>';

    
    var Breadcrumb = Template.extend({

      createView: function(options)  {
        options = _.extend(
          this.attributeModel.getCamelCase(),
          options,
          {
            elementTemplate: this.node.children[0].template,
            datasourcetabs: this.get("datasourcetabs"),
            editable: this.get("editable")
          }
        );
        delete options.node;

        return Template.prototype.createView.apply(this, [options]);
      },

      createSubView: function () {},

      model: function () {
        var model = Template.prototype.model.apply(this, arguments);
        return model && model.input;
      },

      localPath: function () {
        return "user.constraints"
      },

      hasContent: function () {
        return true;
      },

      getDefaultTemplate: function () {
        return DEFAULT_TEMPLATE;
      }

    });

    Breadcrumb.View = ListView.extend({
        
      setModel: function (model) {
        var that = this;
        if (model) {
          model = new FilteredCollection([], {
            delegate: new TreeCollection([], {
                        delegate: model
                      }),
            filter: function (models) {
                      _.defer(function () {
                        that.updateContent();
                      });
                      return _.filter(models, function (model, index) {
                          return model && model.get("description")
                      });
                    }
          });
        }

        ListView.prototype.setModel.apply(this, [model]);

        if (this.model) {
          this.listenTo(this.model, "add", this.updateContent);
          this.listenTo(this.model, "remove", this.updateContent);
        }
      },

      createEntryView: function (options) {
        options = _.clone(options);
        options.elementTemplate = this.options.elementTemplate;
        options.application = this.options.application;
        return ListView.prototype.createEntryView.apply(this, [options]);
      },

      updateContent: function () {
        var models = this.model && this.model.models;

        if (models && models.length > 0) {
          if (!this.titleEl) {
            this.titleEl = this.insertAt(this.make("h2"), 0);
          }
          this.titleEl.innerHTML = i18n("client_sidepane_refinements_label");
          this.$el.show();
        } else {
          this.$el.hide();
          if (this.titleEl) {
            this.titleEl.parentNode.removeChild(this.titleEl);
            delete this.titleEl;
          }
        }
      }

    });

    Breadcrumb.View.EntryView = ListView.EntryView.extend({

      initialize: function () {
        ListView.EntryView.prototype.initialize.apply(this, arguments);
        
        this.listenTo(this.model, "change", this.render);
      },

      createChildView: function (options) {
        return options.elementTemplate.createView(options);
      }

    });

    Breadcrumb.DEFAULT_TEMPLATE = DEFAULT_TEMPLATE;

    return Breadcrumb;
});
