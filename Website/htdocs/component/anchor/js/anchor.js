/*========================================================================
* $Id: anchor.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "client/templateregistry",
    "component!base",
    "utils/string",
    "i18n/i18n",
    "underscore",
    "backbone",
    "jquery",
    "jquery-ui-sortable"
  ], function(
    Template,
    TemplateRegistry,
    ComponentBase,
    StringUtils,
    i18n,
    _,
    Backbone,
    $
  ) {

    var AnchorTemplate = Template.extend({

      initialize: function () {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        this.$el = $(this.el);
      },

      schema: new Template.Schema({
        attributes: {
          href: {
            title: "editor_anchor_href_label",
            type: "url"
          },
          "action-object": {
            title: "editor_anchor_action_object_label",
            type: "action",
            visible: false
          }
        }
      }),

      hasContent: function() { return true },
      getContentSchema: function() {
        return {
          title: "editor_anchor_text_label",
          type: "string"
        };
      },

      getContent: function() { return StringUtils.trim(this.el.innerText); }
  });

  TemplateRegistry.add({
    id: "anchor",
    name: "editor_anchor_title",
    weight: 3,

    getAdders: function (model) {
      return [{
          name: i18n("continue_search", ["Bing"]),
          icon: "../img/opensearch/bing.png",
          options: {
            "action-object": JSON.stringify({
              "openSearch": {}
            }),
            href: "https://www.bing.com/search?cc={language}&q={searchTerms}",
            title: i18n("continue_search", ["Bing"])
          }
        },{
          name: i18n("continue_search", ["DuckDuckGo"]),
          icon: "../img/opensearch/duckduckgo.png",
          options: {
            "action-object": JSON.stringify({
              "openSearch": {}
            }),
            href: "https://duckduckgo.com/?q={searchTerms}",
            title: i18n("continue_search", ["DuckDuckGo"])
          }
        },{
          name: i18n("continue_search", ["Google"]),
          icon: "../img/opensearch/google.png",
          options: {
            "action-object": JSON.stringify({
              "openSearch": {}
            }),
            href: "https://www.google.com/search?hl={language}&lr=lang_{language}&q={searchTerms}",
            title: i18n("continue_search", ["Google"])
          }
        },{
          name: i18n("continue_search", ["Wikipedia (en)"]),
          icon: "../img/opensearch/wikipedia.png",
          options: {
            "action-object": JSON.stringify({
              "openSearch": {}
            }),
            href: "https://en.wikipedia.org/wiki/Special:Search?search={searchTerms}&amp;fulltext=Search",
            title: i18n("continue_search", ["Wikipedia (en)"])
          }
        },{
          name: i18n("continue_search", ["Wikipedia (de)"]),
          icon: "../img/opensearch/wikipedia.png",
          options: {
            "action-object": JSON.stringify({
              "openSearch": {}
            }),
            href: "https://de.wikipedia.org/wiki/Special:Search?search={searchTerms}&amp;fulltext=Search",
            title: i18n("continue_search", ["Wikipedia (de)"])
          }
        },{
          name: i18n("continue_search", ["Yahoo"]),
          icon: "../img/opensearch/yahoo.png",
          options: {
            "action-object": JSON.stringify({
              "openSearch": {}
            }),
            href: "https://search.yahoo.com/search?ei=utf-8&fr=sfp&iscqry=&p={searchTerms}",
            title: i18n("continue_search", ["Yahoo"])
          }
        },{
          name: i18n("continue_search", [i18n("editor_anchor_open_search_generic_engine_title")]),
          icon: "../img/opensearch/generic.png",
          options: {
            "action-object": JSON.stringify({
              "openSearch": {}
            }),
            href: "https://www.example.com?query={searchTerms}",
            title: i18n("continue_search", [""])
          }
      }]
    },

    create: function (options) {
      var title = options.title || i18n("continue_search", [""]);
      delete options.title;

      return Backbone.View.prototype.make(
        "a",
        _.reduce(options, function (attrs, value, key) {
          attrs['data-' + key] = value;
          return attrs;
        }, {}),
        title
      )
    }
  });

  AnchorTemplate.View = ComponentBase.extend({
  });

  return AnchorTemplate;
});
