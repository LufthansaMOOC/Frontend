/*========================================================================
* $Id: pagination.js 99237 2017-06-23 05:36:51Z daniel.eppensteiner $
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
    "api/v2/search",
    "client/template",
    "component!base",
    "client/templateregistry",
    "i18n/i18n",
    "mustache",
    "jquery",
    "underscore",
    "backbone"
  ], function(
    Search,
    Template,
    ComponentBase,
    TemplateRegistry,
    i18n,
    Mustache,
    $,
    _,
    Backbone
  ) {

    var DEFAULT_CONTENT =
            '<a href="#" style="display:none" class="mb-next mb-center mb-block action" data-action="this.nextPage({ append: true })" data-i18n="mobileclient_load_more_results">' + i18n("mobileclient_load_more_results") + '</a>'

    TemplateRegistry.add({
        id: "pagination",
        name: "editor_pager_title",
        weight: 3,

        getAdders: function (model) {
          if (model.type === "view") {
            return [{
                name: "editor_pager_description",
                icon: "../img/imgpagination.png"
            }]
          }
        },
        create: function (options) {
          return Backbone.View.prototype.make("ul", {
              "data-template": "pagination",
              "class": "pager"
            },
            DEFAULT_CONTENT
          );
        }

    });

    var PaginationTemplate = Template.extend({

      initialize: function () {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        this.$el = $(this.el);
      },

      createView: function(options)  {
        var view = new PaginationView(_.extend({}, options, {
              application: options.application,
              template: this,
              el: this.el
        }));
        this.instances.push(view);
        return view;
      },

      remove: function (options) {
        _.forEach(this.instances, function (view) {
            view.remove();
        });
        this.instances = [];
        _.forEach(options.node.children, function (childNode) {
            childNode.template.remove({
                node: childNode
            });
        });
      },

      name: function () {
        return null;
      }
  });

  var PaginationView = ComponentBase.extend({
    initialize: function() {
	ComponentBase.prototype.initialize.apply(this, arguments);
        // this.options
        // this.model
        // this.el
        this.model.on("change", this.render, this);
    },

    render: function() {
      if (!this.el.innerHTML) this.el.innerHTML = Mustache.to_html(DEFAULT_CONTENT, {i18n: i18n.strings});

      if (!this.model.get("resultset.prev_avail")) {
        $("> .mb-previous", this.el).hide();
      }
      else {
        $("> .mb-previous", this.el).show();
      }

      if (!this.model.get("resultset.next_avail")) {
        $("> .mb-next", this.el).hide();
      }
      else {
        $("> .mb-next", this.el).show();
      }
      return this;
    }
  });

  return PaginationTemplate;
});
