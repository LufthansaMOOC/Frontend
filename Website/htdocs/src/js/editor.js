/*========================================================================
* $Id: editor.js 98067 2017-05-11 15:09:42Z michael.biebl $
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
    "utils/jsonpath",
    "editors/template/js/template",
    "client/templatetree",
    "client/layouttree",
    "client/templateregistry",
    "utils/url",
    "editors/adder/js/adder",
    "jquery",
    "underscore",

    "component!row",
    "component!anchor",
    "component!results",
    "component!searchform",
    "component!filteredfacet",
    "component!pagination",
    "component!charts",
  ],
  function(
    i18n,
    JSONPath,
    TemplateEditor,
    TemplateTree,
    LayoutTree,
    TemplateRegistry,
    url,
    Picker,
    $,
    _
  ) {

    function createOption (label, value) {
      var el = document.createElement("option");
      el.value = value;
      el.innerHTML = label;
      return el;
    }

    var Editor = function (application, callback) {
      var that = this;
      window.editor = this;

      $(document.body).addClass("editor-enabled");

      this.application = application;
      this.application.on("stopEditing", this.remove, this);
      this.refresh(callback);
    };

    _.extend(Editor.prototype, {
        create: function () {
          var that = this;

          this.el = document.createElement("div");
          this.el.className = "editor";
          this.formEl = document.createElement("form");
		  $(this.formEl).on("submit", function (e) {
		    e.stopPropagation();
			return false;
		  });
          this.el.appendChild(this.formEl);

          // for the content
          this.editorEl = document.createElement("div");
          this.editorEl.className = "main-editor-view mb-scrollable-y"
          this.formEl.appendChild(this.editorEl);

          document.body.appendChild(this.el);
        },

        save: function () {
          if (this.templateEditor.update()) {
            this.refresh();
          }
        },

        displayEditor: function (template) {
          var that = this,
              // TODO: reference search directly? deactivate all models?
              model = this.application.models.search;

          this.remove();

          if (!template || !template.editable) return;
          this.create();
          $(template.el).addClass("mb-selected");
          this.templateEditor = new TemplateEditor({value: template, model: model});
          this.templateEditor.render();
          this.templateEditor.on("change", function () {
              that.save();
          });
          this.editorEl.appendChild(this.templateEditor.el);
        },

        clearSnippet: function () {
          if (confirm(i18n("editor_restart_confirm"))) {
            $(".mb-snippet-source").html('<div data-template="view" data-count="10" data-constraint="ALL"><div class="mb-component-container container"></div></div>')
            this.refresh();
          }
        },

        exportReload: function () {
          this.application.reload();
          $('#modal_snippet').modal('show'); 
          return true;
        },

        clear: function () {
          $(this.application.templateTree.rootNode.el).find(".mb-selected").removeClass("mb-selected");

          // remove the editor property
          var model = this.application.models.search;
          if (model.input.get("edit_mode") === true) { 
            model.set({"edit_mode": false}, {unset:true, silent:true});
          }

          if (this.templateEditor) {
            this.templateEditor.remove();
            this.templateEditor = null;
          }
          if (this.editorEl) {
            this.editorEl.innerHTML = "";
          }
        },

        unselectTemplate: function (template) {
          if (this.templateEditor && this.templateEditor.template === template) {
            this.clear();
          }
          this.remove();
        },

        refresh: function (callback) {
          var that = this,
              // TODO: reference search directly? deactivate all models?
              model = this.application.models.search;

          model.deactivate();
          this.application.templateTree.destroy(function () {
              that.application.updateSnippet();
              that.application.templateTree = new LayoutTree(that.application.templateTree.rootEl, "searchroot");
              that.application.templateTree.initialize(that.application, model, function () {
                  if (!model.input.get("edit_mode")) { 
                    model.set({"edit_mode": true});
                  }
                  model.activate();
                  if (callback) {callback(that);}
              });
          });
        },

        getAdders: function(context) {
          var adders = TemplateRegistry.getAdders(context, this.application);
          return adders;
        },

        remove: function() {
          this.clear();
          $(this.el).remove();
        }
    });

    Editor.applicationAdditions = {
      editTemplate: function (template) {
        if (this.editor) {
          this.editor.displayEditor(template);
        }
      },

      create: function (templateType, options) {
        this.enableState("has-components");
        return TemplateRegistry.create(templateType, options);
      },

      deleteTemplate: function (template) {
        // TODO: move to template?
        this.editor.unselectTemplate(template);
        if (template.el && template.el.parentNode) {
          template.el.parentNode.removeChild(template.el);
        }
        this.reload();
      },

      stopEditing: function() {
        this.editing = false
        this.trigger("stopEditing");
        $("#edit-button").removeClass("active")
      },

      toggleEditing: function() {
        if (this.editing) {
          this.stopEditing();
        }
        else {
          this.edit();
        }
      },

      updateSnippet: function () {
          var base = url.directory(window.location.protocol + "//" + window.location.host + window.location.pathname) + "../",
              snippet =
              '<link href="' + base + 'css/adapted.css" rel="stylesheet">' +
          $.htmlClean($(".mb-snippet-source").html()
                , {
                  format: true,
                  allowedTags: [],
                  removeTags: [],
                  allowedAttributes: [],
                  removeAttrs: [],
              }).replace(/mb-selected|mb-computing/g, "") +
                  '<script src="' + base + '/../scripts/client.js" data-global-export="false"></script>' +
                  '<script>' +
                    'Mindbreeze.require(["client/application"], function(Application) {' +
                      'var application = new Application({' +
                        (this.options.channels && this.options.channels.length ? 'channels: ' + JSON.stringify(_.collect(this.options.channels, function (channelUrl) {
                                if (url.isRelative(channelUrl)) {
                                  return base + ".." + channelUrl;
                                }
                                return channelUrl;
                          })) : '') +
                      '});' +
                    '});' +
                  '</script>'

          $(".mb-snippet-target").val(snippet);
      },

      enableState: function (state) {
        $(this.templateTree.rootEl).addClass("mb-" + state);
      },

      disableState: function (state) {
        $(this.templateTree.rootEl).removeClass("mb-" + state);
      },

      hidePicker: function () {
        if (!this.picker) return;

        this.picker.remove();
      },

      showPicker: function (model, parent, insertBefore, sortables) {
        if (this.picker) {
          // TODO: is checking parent enough for determining
          // that we don't need to update picker?
          if (this.picker.options.parent === parent) {
            return;
          }
          this.picker.remove();
        }

        this.picker = new Picker({
            model: model,
            application: this,
            parent: parent,
            insertBefore: insertBefore,
            sortables: sortables
        });

        this.picker.model.trigger("change", this.picker.model.at(0), this.picker.model);

        this.picker.render();
        document.body.appendChild(this.picker.el);
      },

      reload: function(callback) {
        // TODO: reference search directly? deactivate all models?
        var model = this.models.search;
        model.deactivate();
        var that = this;
        model.input.clear();
        this.templateTree.reload(this, model, function() {
          if (!model.input.get("edit_mode")) { 
            model.set({"edit_mode": true});
          }
          model.activate();
          if (callback) {callback();}
        }, function () {
          that.updateSnippet();
        });
      }
    };


    return Editor;
});
