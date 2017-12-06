/*========================================================================
* $Id: row.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "client/template",
    "component!base",
    "editors/adder/js/adder",
    "client/templateregistry",
    "utils/url",
    "jquery",
    "underscore",
    "backbone"
  ], function(
    i18n,
    Template,
    ComponentBase,
    AdderView,
    TemplateRegistry,
    url,
    $,
    _,
    Backbone
  ) {

    TemplateRegistry.add({
        id: "row",
        name: "editor_layout_title",
        weight: 0,
        
        getAdders: function (model) {
          return [{
              name: "editor_layout_main_sidebar", 
              icon: "../img/img3col2.png",
              options: {
                spans: [
                  9,
                  3
                ]
              }
            },{
              name: "editor_layout_sidebar_main", 
              icon: "../img/img3col3.png",
              options: {
                spans: [
                  3,
                  9
                ]
              }
            },{
              name: i18n("editor_layout_columns", { number: 2 }), 
              icon: "../img/img2col.png",
              options: {
                spans: [
                  6,
                  6
                ]
              }
            },{
              name: i18n("editor_layout_columns", { number: 3 }), 
              icon: "../img/img3col1.png",
              options: {
                spans: [
                  4,
                  4,
                  4
                ]
              }
            },{
              name: "editor_layout_header", 
              icon: "../img/imgheader.png",
              options: {
                type: "header"
              }
          }];
        },

        create: function (options) {
          var imageBasePath = url.directory(window.location.protocol + "//" + window.location.host + window.location.pathname) + "../img/"

          if (options.type === "header") {
            return Backbone.View.prototype.make(
              "div",
              {
                "class": "mb-header navbar navbar-inverse"
              },
              '<h1>' +
                '<span lang="en" class="mb-acc">Mindbreeze InSpire</span>' +
                '<img class="mb-pulse" src="' + imageBasePath + 'logo-bg.png" alt="">' +
                '<img src="' + imageBasePath + 'logo.png" alt="">' + 
              '</h1>' +
              '<div class="mb-component-container">' + 
              '</div>'
            );
          }
          return Backbone.View.prototype.make("div", {
              "class": "row-fluid"
            },
              _.collect(options.spans, function (width) {
                return '<div class="span' + width + '"></div>';
              }).join('')
          );
        }
    })


    var RowTemplate = Template.extend({

      initialize: function () {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        this.$el = $(this.el);
      },

      createView: function(options)  {
        var row = new RowView(_.extend({}, options, {
              application: options.application,
              template: this,
              el: this.el
        }));
        this.instances.push(row);
        row.render();
        
        _.forEach(options.node.children, function (childNode) {
         childNode.template.createView(_.extend({}, options, {
           node: childNode
         }));
       });

        return row;
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
      }
  });

  var RowView = ComponentBase.extend({

      setEditable: function (editable) {
        if (editable) {
          var container = document.createElement("div");
          this.el.parentNode.insertBefore(container, this.el);
          this.origEl = this.el;
          this.el = container;
          this.el.appendChild(this.origEl);
          this.$el = $(this.el);

          this.insertAt(this.getEditControls(), 0);
          this.$el.addClass("mb-editable mb-editable-row");
        } else if (this.origEl) {
          this.$el.removeClass("mb-editable mb-editable-row");
          this.el.parentNode.insertBefore(this.origEl, this.el);
          this.el.parentNode.removeChild(this.el);
          this.el = this.origEl;
          this.$el = $(this.el);
          delete this.origEl;
        }
      }
  });

  return RowTemplate;
});
