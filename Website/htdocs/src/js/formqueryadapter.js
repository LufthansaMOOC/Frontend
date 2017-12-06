/*=======================================================================
 * $Id: application.js 81183 2014-09-18 19:33:15Z laszlo.lukacs $
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
     "extensions",
     "i18n/i18n",
     "api/v2/api",
     "backbone",
     "jquery"
    ], function(
     _,
     Extensions,
     i18n,
     api,
     Backbone,
     $
   ) {

/*

 */

var FormQueryAdapter = function(options) {
}

_.extend(FormQueryAdapter.prototype, Backbone.Events, {

  USER_QUERY_NAME: "query", /* no label */

  formFieldTagNamePattern: /^input|textarea|select$/i,

  forms: [],

  /* 
     assumption: names of inputs indicate paths in search input
                 names have to be unique (for logically same input)
                 otherwise use data-label for representing labels in query
  */

  fields: {},
  
  addForm: function(el) {
    if (_.indexOf(this.forms, el) >= 0) return;
    this.forms.push(el);
    this._updateFields();
  },

  findElements: function(form) {
    var fields = {};
    var options  = {fieldsetcount: 0};
    var elements = [];
    this.addElement(form, fields, elements, []);
    this._collectFormFields(form, fields, options, [], elements);
    return elements;
  },

  removeForm: function(el) {
    var idx = _.indexOf(this.forms, el);
    if (idx >= 0) {
      delete this.forms[idx];
    }
    this._updateFields();
  },

  _collectFormFields: function(form, fields, options, path, elements, node) {
    
    if (!node) node = form;
    if (!path) path = [];
    /*
      <form>
      <div data-query-fieldset="alternative">
         <input name="X" />
      </div>
      </form>
     */

    var fieldSet = node.getAttribute("data-query-fieldset");
    var id = node.getAttribute("data-name") || "_id_queryfieldset" + JSON.stringify(options.fieldsetcount);
    
    if (fieldSet && fieldSet == "alternatives") {
      path = path.concat(["and", id, "or"]);
      options.fieldsetcount++;
    }

    if (!this.addElement(node, fields, elements, path)) {
      for (var i = 0; i < node.childNodes.length; ++i) {
        // if (node.nodeType != 1) continue; // only elements  
        var childNode = node.childNodes[i];
        if (childNode.nodeType != 1) continue;
        this._collectFormFields(form, fields, options, path, elements, childNode);
      }
    }
  },

  addElement: function (node, fields, elements, path) {
    if (node.tagName.match(this.formFieldTagNamePattern)) {
      var name = node.getAttribute("name"),
          label = node.getAttribute("data-query-label"),
          suffix = node.getAttribute("data-query-path-suffix") || [],
          excluded = node.getAttribute("data-query-exclude"),
          queryType = node.getAttribute("data-query-type") || "unparsed";
      
      if (excluded == "true") {
        suffix = ["not"].concat(suffix);
      }

      if (name != "query" && label == null ) {
        label = name;
      }
      if (!name) return;
      // input fields are leave nodes, stop collecting.

      if (fields[name]) {
        //if (console && console.log)
        //  console.log("Field with same name " + name + " is already present, do not invent new path");
      }
      else {
        if (elements) elements.push(node);

        fields[name] = {};
        if (label) {
          fields[name].label = label;
        }
        if (queryType)
          fields[name].queryType = queryType;

        if (path.length == 0) {
          fields[name].path = ["and", name];
        }
        else {
          fields[name].path = path.concat([name]);
        }

        if (suffix && suffix.length > 0) {
          fields[name].path = fields[name].path.concat(suffix);
        }

      }
      return true;
    }
  },

  _updateFields: function() {
    var that = this;
    var options  = {fieldsetcount: 0};
    this.fields = {};
    _.forEach(this.forms, function (form) {
      that._collectFormFields(form, that.fields, options, []);
    });
  },
  
  dispose: function() {
    delete this.forms;
    delete this.fields;
  },

  /* return the query expr for field */
  field: function(name) {
    return this.fields[name];
  },

  queryField: function() {
    return this.fields[this.USER_QUERY_NAME] || { path: ["and", "query"] };
  },

  _hasAllowedPropertiesOnly: function (obj) {
    var allowedProperties = Array.prototype.slice.call(arguments, 1).sort();
    
    return !_.find(obj, function (value, key) {
      return _.indexOf(allowedProperties, key, true) < 0;
    });
  },
    
  userQueryExprAndPath: function(expr) {
    return this.exprAndPath(this.USER_QUERY_NAME, expr);
  },

  exprAndPath: function(field, expr) {
    /* todo return the transformed expr for field*/
    
    if (!expr) {
      return this.field(field);
    }

    var f = this.field(field),
       expr = _.clone(expr);
     
    if (!f) return null;
    
    if (f.label && !expr.label) {
      expr.label = f.label;
    }

    return {path: f.path, expr: expr};
  }
  
  /**/
  
  /*
  getExprForField: function (model, field) {
    if (!this.fields[field]) return void(0;
    return model.get(this.fields[field].path);
  }
  */

  
});

return FormQueryAdapter;
});
