/*========================================================================
* $Id: editor.js 72847 2013-05-23 15:52:33Z jakob.praher $
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
  "underscore",
  "backbone",
  "editors/values/js/values"
  ],
  function(i18n, _, Backbone, ValueEditors) {

    var ContentEditor = Backbone.View.extend({
      tagName: "div",

      initialize: function(options) {
        this.template = options.template;
        this.editors = [];
        this.schema = this.template.getContentSchema();
      },

      render: function() {
        var ValueEditor = ValueEditors[this.schema.type];
        var content = this.template.getContent();
        var title = i18n(this.schema.title);

        var that = this;
        var updateFunction = function(v, i) {that.template.setContent(v, {at: i});}
        if (!this.schema.repeated || ! _.isArray(content)) {
          content = [content];
          updateFunction = function(v) {that.template.setContent(v);}
        }

        this.valueEditors = [];

        for (var i = 0; i < content.length; i++) {
          var id = _.uniqueId("content");

          if (title) {
            var label = that.make("label", { "for": id }, title);
            this.el.appendChild(label);
          }

          var valueEditor = new ValueEditor({"value": content[i],
                                             "name": id,
                                              "update": function(v) { updateFunction(v, i); return true;}});
          this.valueEditors.push(valueEditor);
          that.listenTo(valueEditor, "change", this._valueChange);
          // valueEditor = valueEditor.render();
          // if (valueEditor instanceof ContentEditor) {
          //   return valueEditor;
          // }

          valueEditor.render();
          // div.appendChild(valueEditor.render().el);
          that.el.appendChild(valueEditor.el);
        }
        return this;
      },

      _valueChange: function(editor, value) {
        this.trigger("change", this, editor);
      },

      update: function() {
        var anyChanged = false;
        _.each(this.valueEditors, function(valueEditor) {
          anyChanged = valueEditor.update() || anyChanged;
        });
        return anyChanged;
      }
    });

    return ContentEditor;

});
