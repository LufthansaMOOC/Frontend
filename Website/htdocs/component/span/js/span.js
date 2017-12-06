/*========================================================================
* $Id: span.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "component!base",
    "underscore",
    "jquery",
    "jquery-ui-sortable"
  ], function(
    Template,
    ComponentBase,
    _,
    $
  ) {

    var SpanTemplate = Template.extend({

      initialize: function () {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        this.editable = false;
        this.$el = $(this.el);
      },

      hasContent: function() { return false },
      getContentSchema: function() {
        return  {
          type: "template"
        };
      },

      getContent: function() { return this.children[0].template; },

      createView: function(options)  {
        var view = new AddView(_.extend({}, options, {
              application: options.application,
              template: this,
              el: this.el
        }));
        this.instances.push(view);
        // TODO: here??
        view.render();
       _.forEach(options.node.children, function (childNode) {
         childNode.template.createView(_.extend({}, options, {
           node: childNode
         }));
       });
        return view;
      }
  });

  var AddView = ComponentBase.extend({

    events: {
      "sortstart": "sortStart",
      "sortstop": "sortStop",
      "sortreceive": "sortReceive"
    },

    initialize: function (args) {
      ComponentBase.prototype.initialize.apply(this, _.toArray(arguments));
    },
    
    getEditControls: function () {
    },

    add: function () {
      if (!this.chooser) {
        var that = this;

        this.options.application.editor.remove();

        this.$el.addClass("mb-selected");
        this.options.application.showPicker(
          this.options.application.editor.getAdders(this.options.model),
          this.options.node,
          this.container,
          $(_.values(AddView._sortables))
        );
      }

    },

    render: function() {
      var that = this,
          container = this.make("div", {
          "class": "mb-adder"
      });
      var add = this.make("a", {
            "class": "mb-add"
       });
      $(add).click(function () {
          that.add();
      });
      container.innerHTML += '<embed src="../img/circle.svg" type="image/svg+xml"></embed>'
      container.appendChild(add);
      this.container = container;

      add.innerHTML = "<i class=\"icon-plus\"></i>";
    
      // todo: track in application?
      // this.options.application
      AddView._sortables  = AddView._sortables || {};
      AddView._sortables[this.cid] = this.el;

      var sortables = $(_.values(AddView._sortables)),
          application = this.options.application;

      this.$el.sortable({
          placeholder: "well",
          scroll: true,
          handle: ".mb-drag-handle",
          connectWith: sortables,
          tolerance: "pointer",
          items: "> *:not(.mb-adder)"
        });

      sortables.sortable( "option", "connectWith", sortables);

      this.appendChild(container, true);

      this.addButton = add;

      return this.el;
    },

    sortStart: function (e, ui) {
      delete this.sortSender;
    },

    sortReceive: function (e, ui) {
      this.sortSender = ui.sender;
    },
    
    sortStop: function (e, ui) {
      if (ui.item.parent()[0] !== this.el) return;

      if (this.sortSender) {
        this.sortSender.trigger("sortinsert", ui);
      }
    },

    remove: function () {
      try {
        this.$el.sortable("destroy");
      } catch (e) {
         // ignore not initialized
      }
      if (this.chooser) {
        this.chooser.remove();
      }
      delete AddView._sortables[this.cid];
      ComponentBase.prototype.remove.apply(this, _.toArray(arguments));
    }
  });

  return SpanTemplate;
});
