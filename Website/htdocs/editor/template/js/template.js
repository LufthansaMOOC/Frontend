/*========================================================================
* $Id: template.js 84100 2015-04-30 14:57:08Z michael.biebl $
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
  "client/views/list",
  "jquery",
  "i18n/i18n",
  "utils/jsonpath",
  "editors/attribute/js/attribute",
  "editors/content/js/content",
  "editors/values/js/values",
  "component!list",
  "component!mustache",
  "model/readonlytree"
  ],
  function(
    _,
    Backbone,
    ListView,
    $,
    i18n,
    JSONPath,
    AttributeEditor,
    ContentEditor,
    ValueEditors,
    ListTemplate,
    MustacheTemplate,
    ReadOnlyTreeModel
  ) {

  var AttributesListView = ListView.extend({

      createEntryView: function (options) {
        var parentView = this.options.parentView,
            desc = options.model.get("attribute"),
            template = this.options.template,
            name = options.model.id,
            editor,
            registrationName = name;

        if (desc.type === "reference") {
          while (template && template.type !== desc.reference) {
            template = template.parentTemplate;
          }

          if (template) {
            editor = new TemplateEditor({value: template, model: parentView.model});
            registrationName = name + "." + desc.reference;
          }
        } else {
          editor = new AttributeEditor({
              template: template,
              model: parentView.model,
              name: options.model.id,
              schema: desc
          })
        }

        if (editor) {
          editor.render();
          this.listenTo(options.model, "destroy", function () {
            var editorIndex = _.indexOf(parentView.editors, editor);
            if (editorIndex) {
              parentView.editors.splice(editorIndex, 1);
            }
            editor.remove();
          });

          parentView.listenTo(editor, "change", parentView._editorChanged);
          parentView.editors.push(editor);
        }
        return editor;
      }
  });

  // A generic editor for templates
  // uses schema for creating fields
  var TemplateEditor = Backbone.View.extend({

    tagName: "div",

    initialize: function(options) {
      this.template = options.value;
      this.model = options.model;
      this.el.className = "template";
      this.editors = [];
    },

    isEmpty: function() {
      return ((!this.template.schema.attributes ||
           this.template.schema.attributes.length == 0) && !this.template.hasContent());
    },

    // add form and fields to this.el
    // can currently only be called once
    render: function () {
      if (!this.template || !this.template.schema) return this;

      var that = this,
          target = this.el;

      if (this.template.name()) {
        target.appendChild(this.make("legend", {}, this.template.name()));
      }

      var attributeCollection = this.template.getSchemaAttributeCollection();
      this.attributesView = new AttributesListView({
          model: attributeCollection,
          template: this.template,
          parentView: this
      });
      this.el.appendChild(this.attributesView.render().el);

      // var contentSchema = this.template.contentSchema();
      if (this.template.hasContent()) {
        var contentEditor = new ContentEditor({template: that.template});
        this.listenTo(contentEditor, "change", this._editorChanged);

        // if we have no attirbutes just return the content editor
        // if (this.editors.length == 0) {
        //   contentEditor.render();
        //   return contentEditor;
        // }
        this.editors.push(contentEditor);
        target.appendChild(contentEditor.render().el);
      }

      return this;
    },

    createPathBreadCrumb: function() {
      var el  = this.make("div", {"class": "breadcrumb"});
      var listTemplate = new ListTemplate(this.make("ul", {"class": "breadcrumb", "data-model": "path"}));
      var mustacheTemplate = new MustacheTemplate(
        this.make("script",
                  {"data-tag-name": "li"},
                  '<a href="#">{{{.}}}</a> <span class="divider">/</span>'));

      listTemplate.children = [{template: mustacheTemplate}];
      var model = new ReadOnlyTreeModel();
      var view = listTemplate.createView({model: model});
      model.load({path: this.template.path()});
      el.appendChild(view.el);
      return el;
    },


    _editorChanged: function(editor, value) {
      this.trigger("change", this, editor);
    },

    update: function() {
      var anyChanged = false;
      _.each(this.editors, function(editor) {
        anyChanged = editor.update() || anyChanged;
      });
      return anyChanged;
    },

    remove: function () {
      this.attributesView.remove();
      Backbone.View.prototype.remove.apply(this, arguments);
    }
  });

  ValueEditors["template"] = TemplateEditor;
  return TemplateEditor;
});
