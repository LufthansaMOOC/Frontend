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
    "underscore",
    "backbone",
    "component!base",
    "client/views/list",
    "component!suggest",
    "component!base",
    "utils/dom",
    "jquery",
    "client/template",
    "client/templateregistry",
    "i18n/i18n"
  ],
  function(
    _,
    Backbone,
    ComponentBase,
    ListView,
    SuggestTemplate,
    Base,
    dom,
    $,
    Template,
    TemplateRegistry,
    i18n
  ) {

    var SuggestList = SuggestTemplate.extend({

      initialize: function() {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        this.$el = $(this.el);

        var suggest_source = this.get("source-id-pattern") || "",
            suggest_count = this.get("count"),
            suggest_title = this.get("title") || "",
            suggest_property = this.get("property");

        var suggestlist_model = "suggestlist_" + suggest_source;
        this.application.models[suggestlist_model] = this.application.api.suggest.createModel(this.application.models.channels);

        var view = new SuggestListView(_.extend({}, {
              application: this.application,
              template: this,
              el: this.el,
              source: suggest_source,
              count: suggest_count,
              property: suggest_property,
              title: suggest_title
        }));
        this.instances.push(view);
        return view;
      },

      createView: function(options)  {
      },

      remove: function (options) {
        this.el.innerHTML = "";
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

      schema: new Template.Schema({
        attributes: {
          "source-id-pattern": {
            type: "string",
            title: "editor_suggest_source_id_pattern",
            default: "popularsearches"
          },
          "property": {
            type: "string",
            title: "editor_suggest_property",
            default: "title"
          },
          "count": {
            type: "int",
            title: "editor_result_title",
            default: 5
          },
          "title": {
            type: "string",
            title: "suggest_title",
            default: "Popular Searches"
          }
        }
      })

    });

    SuggestListView = ComponentBase.extend({
      initialize: function () {
        Base.prototype.initialize.apply(this, arguments);

        this.listenTo(this.options.application.models.search, "computing", _.bind(function() {
          this.createSuggest();
        }, this));
      },

      createSuggest: function() {
        var suggest_count = this.options.count,
            suggest_property = this.options.property,
            suggest_source = this.options.source,
            suggest_title = this.options.title,
            search_query = this.options.application.getUnparsedUserQuery() || "";

        var suggestlist_model = "suggestlist_" + suggest_source;

        var that = this;

        var request = {query: search_query, property: suggest_property, count: suggest_count, "source_id_pattern": suggest_source};
        this.options.application.models[suggestlist_model].set(request);

        this.listenTo(this.options.application.models[suggestlist_model], "change", function() {
          that.render(this.options.application.models[suggestlist_model]);
          that.stopListening(this.options.application.models[suggestlist_model], "change");
        });
      },

      render: function(model, source) {
        if (!model.output.get("results")) {
          $(this.el).find('.suggestListElement').remove();
          return;
        }

        var suggestListElement = document.createElement("div");
        var titleEl = document.createElement("h3");
        var entry = document.createElement("ul");

        suggestListElement.className = "suggestListElement";
        entry.className = "nav nav-stacked nav-pills";
        titleEl.className="suggestListTitle";

        titleEl.innerHTML = this.options.title;

        _.each(model.output.get("results"), function(el) {
          var value = _.escape(el.value);
          entry.innerHTML += '<p><a href="#" data-action="application.setUnparsedUserQuery(&quot;'+ value +'&quot;)">' + value + '</a></p>';
        });

        $(suggestListElement).append(titleEl);
        $(suggestListElement).append(entry);

        $(this.el).find('.suggestListElement').remove();
        $(this.el).append(suggestListElement);
      },

      remove: function () {
        Base.prototype.remove.apply(this, arguments);
      }

    });

    SuggestList.View = SuggestListView;
    return SuggestList;
  }
);
