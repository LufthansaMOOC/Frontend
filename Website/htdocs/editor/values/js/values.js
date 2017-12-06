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
    "jquery",
    "underscore",
    "libs/jquery.htmlClean-1.3.0.min",
    "libs/faba5.editor-1.1",
    "bootstrap"
  ],
function(i18n, Backbone, $, _) {

  var CHANGE_TIMEOUT = 500;

  var ValueEditors = {};
  // TODO: make extensible
  //       use factory like Formats
  //

  var ValueEditor = Backbone.View.extend({
    events: {
      "change": "_onChange",
      "keyup": "_changeAfterTimeout"
    },

    initialize: function(options) {
      var that = this;
      this.changed = false;
      if (options.value !=  null) {
        this.setValue(options.value);
        this.el.defaultValue = options.value;
      }

      this.el.id = this.options.name;
    },
    
    value: function() {
      return this._value;
    },

    defaultValue: function() {
      return this.el.defaultValue;
    },

    setValue: function(value) {
      if (this._value != value) {
        this._value = value;
        if (this.getUiValue() !== this._value) {
          this.updateUiValue();
        }
        this.changed = true;
        this.trigger("change", this, value);
      }
    },

    updateUiValue: function () {
      this.el.value = this._value;
    },

    _onChange: function() {
      this.setValue(this.getUiValue());
    },

    _changeAfterTimeout: function () {
      var that = this;

      if (this._changeTimeout) {
        window.clearTimeout(this._changeTimeout);
      }
      this._changeTimeout = window.setTimeout(function () {
          that._onChange();
      }, CHANGE_TIMEOUT);
    },

    getUiValue: function () {
      return this.el.value;
    },

    update: function() {
      var ret = this.options.update(this.value());
      this.changed = false;
      this.el.defaultValue = this.value();
      return ret;
    },

    render: function () {
      return this;
    }
  });

  var TextInputEditor = ValueEditor.extend({
    tagName: 'input',

    render: function() {
      this.el.setAttribute("type", "text");
      return this;
    }
  });

  var CheckboxEditor = ValueEditor.extend({
    tagName: 'input',

    render: function() {
      this.el.setAttribute("type", "checkbox");
      this.updateUiValue();
      return this;
    },
    
    updateUiValue: function () {
      this.el.checked = this._value;
    },

    getUiValue: function () {
      return this.el.checked;
    },
  });

  var TextSelectEditor = ValueEditor.extend({
    tagName: 'select',

    initialize: function(options) {
      ValueEditor.prototype.initialize.apply(this, arguments);

      var that = this;
      this.changed = false;
      
      if (options.values) {
        if (options.values.bind && options.model) {
          var selectOptions = options.model.get(options.values.bind.options);
          var textKey  = options.values.bind.text|| options.values.bind.value || "text";
          var valueKey = options.values.bind.value || "value";
          
          if (selectOptions) {
            _.each(selectOptions, function(option) {
              if (options.defaultValue == option[valueKey]) {
                that.el.appendChild(that.make("option", {value: option[valueKey], selected: true}, option[textKey]));
              }
              else {
                that.el.appendChild(that.make("option", {value: option[valueKey]}, option[textKey])); 
              }
            });
          }
        } else {
          _.forEach(options.values, function (value, key) {
            if (!value) return;

            var theValue = value.value === undefined ? value : value.value,
                attrs = {
                  value: theValue
                };

            if (options.defaultValue == theValue) {
              attrs["selected"] = true;
            }
            that.el.appendChild(that.make("option", attrs, value.text === undefined ? value : value.text));
          });
        }
      }
      
      if (options.value) {
        this.setValue(options.defaultValue);
        this.el.defaultValue = options.defaultValue;
      }
    }

  });


  var TextAreaEditor = ValueEditor.extend({
    tagName: 'textarea'
  });

  ValueEditors["enum"]      = TextSelectEditor;
  ValueEditors["string"]    = TextInputEditor;
  ValueEditors["QueryExpr"] = TextInputEditor;
  ValueEditors["int"]       = TextInputEditor;
  ValueEditors["mustache"]  = TextAreaEditor;
  ValueEditors["boolean"]    = CheckboxEditor;

  ValueEditors.ValueEditor = ValueEditor;

  return ValueEditors;
});
