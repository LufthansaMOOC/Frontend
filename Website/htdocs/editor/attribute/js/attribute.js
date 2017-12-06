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
  "backbone",
  "editors/values/js/values",
  "jquery"
  ],
  function(i18n, Backbone, ValueEditors, $) {

    var AttributeEditor = Backbone.View.extend({
      tagName: "div",

      initialize: function(options) {
        this.template = options.template;
        this.model = options.model;
        this.name = options.name;
        this.schema = options.schema;
        this.active = this.template.hasAttribute(this.name) || this.schema.required;
        $(this.el).addClass("attribute");
      },

      setActive: function(v) {
        if (!this.checked)  return;
        this.active = v;
        if (this.active) {
          $(this.checked).addClass("active");
        }
        else {
          $(this.checked).removeClass("active");
        }
        this.checked.innerHTML = this.checkedIcon(this.active);
      },

      checkedIcon: function(active) {
        if (active) {
          return '<i class="icon-remove"></i>';
        }
        else {
          return '<i class="icon-ok"></i>';
        }
      },

      render: function() {
        var label,
            that = this;
        if (this.schema.title) {
          label = this.make("label", {"for": this.name, "class": "attribute-label"}, i18n(this.schema.title));
          this.el.appendChild(label);
        } else {
          label = this.make("label", {"for": this.name, "class": "attribute-label"}, this.name);
          this.el.appendChild(label);
        }

        var div = this.make("div");

        if (!this.schema.required) {
          var checkedClassName = "checked btn";
          if (this.active) {
            checkedClassName += " active";
          }
          var checked = this.make("button", {"class": checkedClassName},
                                  this.checkedIcon(this.active));
          this.checked = checked;
          this.setActive(this.active);
          div.appendChild(this.checked);
          $(this.checked).click( function(event) { 
                                             //event.preventDefault();                                                                                          
                                             //that.setActive(!that.active);
                                             event.preventDefault();
                                             return false; 
                                        });
        }

        var valueEditorWrapper = this.make("span", {"class": "value-editor"});
        var ValueEditor = ValueEditors[this.schema.values ? "enum" : this.schema.type] || ValueEditors["string"];
        var value = this.template.schema.serializeAttribute(this.template.get(this.name), this.name);

        var modelWrapper = {
            get: function(localpath) {          
              return that.model && that.model.get([localpath], {path: that.template.path()});
            }
        };
        
        var defaultValue = value;
        if (value === undefined && this.schema.model_stored !== false) {
          var localPath = this.schema.path || this.name;
          defaultValue = modelWrapper.get(localPath);
        }

        this.valueEditor = new ValueEditor({"value": value,         
                                            "defaultValue": defaultValue,
                                            "model": modelWrapper,
                                            "name": this.name,
                                            "values": this.schema.values,
                                            "update": function(v) { that.template.setAttribute(that.name, v); return true;} });
        this.listenTo(this.valueEditor, "change", this._valueChange);
        valueEditorWrapper.appendChild(this.valueEditor.render().el);
        div.appendChild(valueEditorWrapper);
        this.el.appendChild(div);
        return this;
      },

      _valueChange: function(editor, value) {
        this.setActive(true);
        this.trigger("change", this, editor);
      },

      update: function() {
        if (!this.active && this.template.hasAttribute(this.name)) {
          // remove the attribute if it was active before
          this.template.removeAttribute(this.name);
          return true;
        }
        if (this.valueEditor.changed) {
          return this.valueEditor.update();
        }
        
        return false;
      },

      updateTemplateBinding: function (template) {
        this.template = template;
        this.valueEditor.updateTemplateBinding(template);
      }
    });

    return AttributeEditor;

});
