/*

ResultCollection Template
Table

*/

define([
        "client/template",
        "client/resourceinfo",
        "component!results",
        "underscore",
        "jquery",
        "jquery-ui-autocomplete",
        "moment",
        "handsontable",
        "utils/inplace-edit",
        "i18n/i18n",
        "utils/browser"
        ],
        function (
      Template,
      ResourceInfo,
      Results,
      _,
      $,
      JQueryUI,
      moment,
      Handsontable,
      InplaceEdit,
      i18n,
      browser
      ) {

    var attrcounter = 0;

    // TODO: use require css plugin.
    var loadCss = function (url, id) {
    var el = document.getElementById(id);

     if (!el) {
       el = document.createElement("link");
       el.rel = "stylesheet";
       el.href = url;
       el.id = id;
       (document.head || document.getElementsByTagName("script")[0].parentNode).appendChild(el);
     }
  }

  // TODO: load depending on minified config
  loadCss(ResourceInfo.scriptLocation + "/handsontable/handsontable.full.min.css", "mbHandsontableCss");

  function LoadMoreResultsPlaceHolder (obj) {
    this.value = obj;
  }

  _.extend(LoadMoreResultsPlaceHolder.prototype, {

    get: function(name, options) {
      return this.value;
    }

  });

      var ResultsView = Results.View,
      HandsonTableView = ResultsView.extend({

        events: function () {
          return _.extend(
            {},
            ResultsView.prototype.events,
            {
              "dblclick th .colHeaderEl": "headerClicked",
              "click th .delAll" : "delClicked",
              "keydown .colHeader input" : "keyDetection",
              "click .colHeader input" : "setFocus",
              "click .icon_remove" : "breakInput",
              "click .icon_ok" : "doInput",
              "click #addColHeader" : "AddClicked",
              "click .exportToCSV" : "showExportDownloader"
            }
          );
        },

        /*
          internal representation:
          'Befund' -> ['DKBEFTXT', 'YBSBEFTXT']
          external:
          'DBKBEFTXT' -> { format: "PROPERTY" }
          'YBSKBEFTXT' -> { format: "PROPERTY" }

          string -> [string]
          {
          name: string
          ids: [string]
          }
        */
        setFocus: function(){
          $('.InputField').focus();
        },

        keyDownLoadMore: function(e){
          if (e.keyCode == 40){
            this.afterScrollVertically();
          }
        },

        getDisplayedProperties: function () {
          // TODO: transform
          function getFormatOptions(property) {
            return { formats: property === "mes:summary" ? ["PROPERTY"] : ["VALUE", "HTML"] };
          }
          var displayProperties = _.reduce(this.properties, function (displayProperties, property) {
            if (_.isString(property)) {
              // TODO: think and correct
              displayProperties[JSON.stringify(property.replace(/\..*/, ""))] = getFormatOptions(property);
            } else {
              _.each(property.ids, function(id) {
                // TODO: think and correct
                displayProperties[JSON.stringify(id.replace(/\..*/, ""))] = getFormatOptions(property);
              });
            }
            return displayProperties;
          }, {});
          displayProperties.noadditionalproperties = true;
          return displayProperties;
        },

        initialize: function (options) {
          this.properties = [];
          this.doInputOrWriteAdd = false;
          this.doInputOrWriteProp = false;
          this.editProperties = false;
          this.h_counter = 0;

          this.tableData = [];

          if (options.model) {
            this.updateTranslatedPropertyMap(options.model);

            var exportPropertiesModel = this.options.application.models.exportProperties;
            var exportProperties = this.options.application.models.exportProperties && this.options.application.models.exportProperties.get("properties");
            var saveStandardProperties = this.options.application.models.exportProperties && this.options.application.models.exportProperties.get("standardProperties");

            if (!saveStandardProperties && exportPropertiesModel) {
              this.options.application.models.exportProperties.set( {"standardProperties": this.buildPropertiesFromModel(this.options.model)} );
            }

            if (exportPropertiesModel) {
              this.listenTo(exportPropertiesModel, "change", this.handleExportPropertiesModelChange);
            }

            if (exportProperties && !_.isObject(exportProperties)) {
              this.properties = this.buildPropertiesFromArray(exportProperties);
            } else {
              this.properties = this.buildPropertiesFromModel(this.options.model);
            }

            if (!this.savePropertiesForReset) this.savePropertiesForReset = this.buildPropertiesFromModel(this.options.model);

          }

          var allowExportDiv = $('div[data-template="table"]');

          if (options.application.options.exportformat) {
            this.options.exportformat = options.application.options.exportformat;
          }

          if(this.options.allowexport){
            if(!_.isEmpty(allowExportDiv)) allowExportDiv.find('#allowExportTable').hide();
            allowExportDiv.prepend('<div id="allowExportTable"><button class="exportToCSV mb-dont-serialize" data-action-object="{&quot;exportSearch&quot;:{&quot;exportFormat&quot;:&quot;'+this.options.exportformat+'&quot;}}">'+ i18n('editor_export') +'</button></div>');

            if(!$('.showExportList').length){
              $('.mb-top-menu ul').append(
                $('<li>').append(
                  $('<button class="showExportList">').attr({
                                    'data-action-object':'{"showExports": {}}'
                                }).append(
                                  $('<i>').attr('class','icon-download')
              )));
            }

          } else {
            allowExportDiv.find('#allowExportTable').hide();
          }

          var that = this;
          this.tableEl = this.make("div");
          this.appendChild(this.tableEl, false);

          this.table = new Handsontable(this.tableEl, {
            data: this.tableData,
            contextMenu: false,
            readOnly: true,
            contextMenu: false,
            afterScrollVertically: _.bind(this.afterScrollVertically, this),
            beforeKeyDown: _.bind(this.keyDownLoadMore, this),
            manualColumnResize: true,
            manualColumnMove: false,
            allowRemoveColumn: true,
            columns: this.getColumns(),
            autoColumnSize: true,
            colHeaders: this.getColHeaders(),
            colWidths: this.getColWidth(),
            afterSelection: _.bind(this.afterSelection, this)
          });

          ResultsView.prototype.initialize.apply(this, arguments);
          this.collection.constructor.prototype.push = function () {};
          this.collection.constructor.prototype.slice = function () {
            return this.models.slice.apply(this.models, arguments);
          };
          this.collection.constructor.prototype.splice = function () {};
          this.collection.length = this.collection.models.length;

          $(window).resize(_.bind(function() {
            this.afterScrollVertically();
          }, this));

          var $menu = $('.loaderLeft');
            $(document).on('click', function (e) {
              if ($menu.is(':visible') && !$menu.is(e.target) && !$menu.has(e.target).length) {
                that.setDownloaderColorGrey();
                $menu.hide();
              }
          });

          $('.showExportList').on('click', function (e) {
             if ( $menu.is(':visible') ) {
                that.setDownloaderColorGrey();
             }
             else {
              that.setDownloaderColorWhite();
             }
          });

          $('.showExportList').hover(
            function (e) {
              that.setDownloaderColorWhite();
            },
            function (e) {
              if (!$menu.is(':visible')) {
                that.setDownloaderColorGrey();
              }
            }
          );

          this.table.addHook("beforeRender", function(isForced) {
            this.lastRowRenedered = false;
            this.lastTR = null;
            this.placeholderTargetEl = null;
            this.tableRendering = true;
          });

          var baseAlter = this.table.alter;
          this.table.alter = function(action, index, amount, source, keepEmptyRows) {
            if (action == "remove_col") {
              return that.removeColumnByIndex(index, amount, source, keepEmptyRows);
            }
            return baseAlter.apply(that.table, arguments);
          }

          if (this.options.appendonscroll === false) {
            if ( $(this.el).find(".mb-not-append-results").length ) return;
            var loadMoreResults = i18n("mobileclient_load_more_results");
            $(this.el).append('<div><a href="#" class="mb-next mb-center mb-block action mb-not-append-results" data-action="this.nextPage({ append: true })">'+loadMoreResults+'</a></div>');
          }

        },

        getColWidth: function() {
          var useRelevanceInfo = browser.getURLParameter("relevance-info") === "true";
          if (useRelevanceInfo) {
            if ($(this.el).hasClass("relevanceInfoTable")) return [70, 170, 130, 90, 90, 70, 70, 100, 100, 100, 100, 100, 100, 170, 100, 100];
          }
        },

        sanitizeProperties: function (properties) {
          if (properties && properties.length && !_.isObject(properties[0])) {
            return this.buildPropertiesFromArray(properties);
          }
          return properties;
        },

        handleExportPropertiesModelChange: function () {
          var exportPropertiesModel = this.options.application.models.exportProperties;
          this.properties = this.sanitizeProperties(exportPropertiesModel.get("properties"));
          this.updateColumns();
        },

        updateColumns: function () {
          this.setEditProperties();
          this.collection.setProperties(this.getDisplayedProperties());
        },

        setDownloaderColorGrey: function() {
          $('.showExportList').css("color","#808080");
        },

        setDownloaderColorWhite: function() {
          $('.showExportList').css("color","#ffffff");
        },

        remove: function() {
          this.table.destroy();
          if (this.tableEl && this.tableEl.parentNode) this.tableEl.parentNode.removeChild(this.tableEl);
          ResultsView.prototype.remove.apply(this, arguments);
          return this;
        },

        modelComputed: function() {
          // ResultsView.prototype.computed.apply(this, arguments);
          //this.table.updateSettings({columns: this.getColumns(), colHeaders:this.getColHeaders()});
          if (!this.editProperties) {
            this.afterScrollVertically();
          }
        },

        isVisible: function(el) {
          function pageY(elem) {
            return elem.offsetParent ? (elem.offsetTop + pageY(elem.offsetParent)) : elem.offsetTop;
          }
          var $scrollContainer = $(el).scrollParent();
          var $el = $(el);
          var scrollTop = $scrollContainer.scrollTop();

          var offsetMethod = $scrollContainer[0] == window ? 'offset' : 'position'

          var offset = $el[offsetMethod]().top;
          if (!$.isWindow($scrollContainer.get(0))) {
            var pageYContainer = pageY($scrollContainer.get(0));
            var pageYEl = pageY($el.get(0));
            offset = pageYEl - pageYContainer;
          }
          var bottomOffset = offset - $scrollContainer.outerHeight();

          return (scrollTop >= bottomOffset);
        },

        afterScrollVertically: function(){
          if (!this.model || !this.model.get("resultset.next_avail")) return;
          if (this.editProperties) return;

          if (this.lastTR && this.isVisible(this.lastTR)) {
            this.lastTR = false;
            if (this.pagingAllowed && this.options.appendonscroll) {
              this.appendontablescroll = true;
              this.page();
            }
          }
        },

        showExportDownloader: function(){
          $('.showExportList').addClass("exportDownloaderBlink");
          this.setDownloaderColorWhite();
        },

        delMouseEntered: function(e){
          if(!$('.colHeaderEl').find("input").length > 0){
            $(e.currentTarget).find('.btn_del').css("display","block");
          }
        },

        delMouseLeave : function(e){
          $(e.currentTarget).find('.btn_del').css("display","none");
        },

        delClicked: function(e){
          var tar = $(e.currentTarget);
          var position = tar.find("[data-index]").attr("data-index");

          if (this.options.application.models.exportProperties) {
            this.properties.splice(position, 1);
            this.options.application.models.exportProperties.set({"properties": _.union(this.properties)});
          } else {
            this.removeColumnByIndex(position, 1);
            this.getPropertiesForTemplate();
          }
        },

        updateTranslatedPropertyMap: function(model) {
          model = model || this.model;
          if (!model) return;
          var result  = _.reduce(model.get("available_properties"),
                                 function(obj, p) {
                                     var pname = p.localized_name || p.name;
                                     var score = p.localized_name ? 10 : 1;
                                     var result = obj.name2IDs;
                                     if (result[pname]) {
                                         if (!_.contains(result[pname].ids, p.name)) {
                                            result[pname].ids.push(p.name);
                                         }
                                     }
                                     else {
                                         result[pname] = { label: pname, name: pname, ids: [p.name], score: score };
                                     }
                                     obj.id2Property[p.name] = pname;
                                     return obj;
                                 }
                                 ,
                                 {name2IDs:{}, id2Property: {}});

          this.translatedPropertyMap = result.name2IDs;
          this.propertyTranslationMap  = result.id2Property;

          return this.translatedPropertyMap;
        },

        propertiesFromNames: function(names) {
          return _.reduce(names, function(properties, p) { properties[p] = { formats: ["HTML", "VALUE"]}; return properties }, {});
        },

        buildPropertiesFromArray: function(properties) {
          var that = this;
          var props = _.reduce(properties, function (props, prop) {
              var name = prop;
              var ids = [prop];
              var localized_name = that.propertyTranslationMap[prop];
              if (localized_name) {
                  var translatedProperty = that.translatedPropertyMap[localized_name];
                  if (translatedProperty) {
                      name = translatedProperty.name;
                      ids = translatedProperty.ids;
                  }
              }
              if (!props.map[name]) {
                  props.map[name] = { name: name, ids: ids };
              }
              else {
                  props.map[name].ids = _.union(props.map[name].ids, ids);
              }
              props.list.push(props.map[name]);

              return props;
          }, { map: {}, list: []});

          return props.list;
        },

        buildPropertiesFromModel: function(model) {
          var that = this,
               propertyNames = this.options.properties;

          if (!model.input.get("properties") || _.isEmpty(model.input.get("properties"))) {
            model.input.set("properties", this.propertiesFromNames(this.options.properties));
          }

          if (!propertyNames || propertyNames.length < 1) {
            propertyNames = _.keys(model.input.get("properties"));
          }

          var props = _.reduce(propertyNames, function (props, prop) {
              var name = prop;
              var ids = [prop];
              var localized_name = that.propertyTranslationMap[prop];
              if (localized_name) {
                  var translatedProperty = that.translatedPropertyMap[localized_name];

                  if (that.options.application.options.excludeFromTranslation) {
                    var excludeFromTranslation = that.options.application.options.excludeFromTranslation;
                  } else {
                    var excludeFromTranslation = that.options["exclude-from-translation"]
                    that.options.application.options.excludeFromTranslation = excludeFromTranslation;
                  }

                  if (translatedProperty) {
                    if (excludeFromTranslation && (excludeFromTranslation.indexOf(name) >= 0)) {
                    } else {
                      name = translatedProperty.name;
                      ids = translatedProperty.ids;
                    }
                  }
              }
              if (!props.map[name]) {
                  props.map[name] = { name: name, ids: ids };
              }
              else {
                  props.map[name].ids = _.union(props.map[name].ids, ids);
              }
              props.list.push(props.map[name]);

              return props;
          }, { map: {}, list: []});

          return props.list;
        },

        setModel: function (model) {
          var that = this;
          if (model) {
            this.updateTranslatedPropertyMap(model);
            this.buildPropertiesFromModel(model);
          }
          // set this.model
          ResultsView.prototype.setModel.apply(this, arguments);

          this.collection.once("add", function () {
            var availableProperties = that.model.get("available_properties");

            if (!_.isEmpty(availableProperties)) {
              _.each(that.properties, function(prop){
                var propertyFound = _.find(availableProperties, function(property) { return property.name == prop.ids[0] });
                prop.name = propertyFound.localized_name;
              });
            }

            that.table.updateSettings({columns: that.getColumns(), colHeaders: that.getColHeaders()});
          });

          if (this.model)
            this.listenTo(this.model, 'computed', this.modelComputed);
          this.listenTo(this.collection, "remove", this.removeOne);
          this.listenTo(this.collection, "change", this.update);
        },

        removeColumnByIndex: function(index, amount) {
          var that = this;
          var removed = this.properties.splice(index, amount);
          _.each(removed,
            function(property) {
              that.collection.removeProperty(property, {silent: true});
            });
          if (removed.length > 0) this.collection.change();
            this.collection.setProperties(this.getDisplayedProperties());
            this.table.updateSettings({columns: this.getColumns(), colHeaders:this.getColHeaders()});
        },

        addColHeader: function(position) {
          if(!this.doInputOrWriteAdd){
            this.doInputOrWriteAdd = true;
            return "<button class='action' id='addColHeader' data-index='" + position + "' disabled='disabled' data-message='addNewHeader'>+</button>";
          }
          return "<button class='action' id='addColHeader' data-index='" + position + "' data-message='addNewHeader'>+</button>";
        },

        addColumnData: function() {
          return null;
        },

        getCurrentProperties: function() {
          return this.properties;
        },

        getColumns: function() {
          var that = this;

          if(this.options.edittable){
             return _.map(this.getCurrentProperties(),  function(el) { return that.attr(el); } ).concat(that.addColumnData);
           } else {
             return _.map(this.getCurrentProperties(),  function(el) { return that.attr(el); } );
           }
        },

        getColHeaders: function(optionalProperties) {

          if(optionalProperties) {
            var curProp = optionalProperties;
          } else {
            var curProp = this.getCurrentProperties();
          }
          var curPropInp = [];
          var value;

          if(this.options.edittable){
            if(!this.doInputOrWriteProp){
              this.doInputOrWriteProp = true;
              for ( var i = 0; i < (curProp.length); i++){
                value = curProp[i].name || curProp[i];
                value = i18n(value);
                curPropInp[i] = '<div data-index="' + i + '" id="' + value + '" class="colHeaderElBeforeLoad action" data-value="' + value + '"><a data-i18n='+ value +'>'+ value + '</a></div>';
              }
            } else {
              for ( var i = 0; i < (curProp.length); i++){
                value = curProp[i].name || curProp[i];
                value = i18n(value);
                curPropInp[i] = '<div data-index="' + i + '" id="' + value + '" class="colHeaderEl action" data-value="' + value + '"><a>'+ value +'</a></div><div data-index="' + i + '" class="delAll"><button data-index="' + i + '" class="btn_del"><i class="icon-trash"></i></button></div>';
              }
            }
            return curPropInp.concat(this.addColHeader(i));

          } else {
            for ( var i = 0; i < (curProp.length); i++){
              value = curProp[i].name || curProp[i];
              value = i18n(value);
              curPropInp[i] = '<div data-index="' + i + '" id="' + value + '" class="colHeaderElBeforeLoad action" data-value="' + value + '"><a data-i18n='+ value +'>'+ value + '</a></div>';
            }
            //Props without "+"
            return curPropInp;
          }
        },


        getValue: function (result, id) {
          var  prop = result && result.get(JSON.stringify(id), {format: "VALUE"});
          if (_.isObject(prop) || !prop ) {
            var  prop = result && result.get(JSON.stringify(id), {format: "HTML"});
            return prop;
          }
          return prop;
        },

        getValuesAndFormat: function (result, id) {
          // TODO: use JSONPath? Or is there an XPath like variant?
          var idParts = id.split(".");
          var id = idParts[0];
          var nestedPropertyName = idParts.length > 0 ? idParts[1] : undefined;

          var  props = result && result.get(JSON.stringify(id), {format: "VALUE"});
          // if prop is not string
          if (_.isObject(props) || !props ) {
            var  props = result && result.get(JSON.stringify(id), {format: "HTML"});

          if (nestedPropertyName && props && props.properties) {
            var obj = {};
            _.each(props.properties, function(property) {
              var key = property.data[0]['property:id'];
              if (nestedPropertyName === key) {
                props = property.data[0].html;
              }
            });
          }

            return {format: "HTML", values: props};
          }
          return  {format: "VALUE", values: props};
        },

        attr: function (attr) {
          var that = this;

          // this lets us remember `attr` for when it is get/set
          // result is the line in the table
          // if value is defined then this is a set operation
          return {
            data: function(result, value) {
              if (_.isUndefined(value)) {

                if (!attr) return null;

                var ids = _.isString(attr) ? [attr] : attr.ids;
                var values = _.map(attr.ids, function(id) {
                    var valueAndFormat = that.getValuesAndFormat(result, id);
                    return valueAndFormat;
                  });
              }

              if (values && values.length > 0) return values;
              return null;
            },
            renderer: _.bind(that.formattedRenderer, that)
          }
        },

        innerHTMLRenderer: function(instance, td, row, col, prop, value, cellProperties) {
          var escaped = Handsontable.helper.stringify(value);
          td.innerHTML = escaped;
          return td;
        },

        formattedRenderer: function(instance, td, row, col, prop, valuesAndFormatList, cellProperties) {
            var mergeValuesAndFormatList = function(valuesAndFormatList) {
                var format = "VALUE";

                var shallRemoveDuplicateValues = true; // TODO: make configurable if list-mode will be needed
                var allValues = [];
                var alreadyAddedValues = {};

                if (_.isObject(valuesAndFormatList)) {
                    for (var i=0; i < valuesAndFormatList.length; i++) {
                        var valuesAndFormat = valuesAndFormatList[i];
                        if (valuesAndFormat && valuesAndFormat.values) {
                            if (valuesAndFormat.format == "HTML") {
                                format = "HTML";
                            }

                            if (!_.isArray(valuesAndFormat.values)) {
                                valuesAndFormat.values = [ valuesAndFormat.values ];
                            }

                            for (var j=0; j < valuesAndFormat.values.length; j++) {
                                var value = valuesAndFormat.values[j];
                                if (shallRemoveDuplicateValues) {
                                    if (!(value in alreadyAddedValues)) {
                                        allValues.push(value);
                                        alreadyAddedValues[value] = true;
                                    }
                                } else {
                                    allValues.push(value);
                                }
                            }
                        }
                    }
                }

                var mergeResult = allValues.join(", ");

                return {
                    stringValue: mergeResult,
                    format: format
                };
            };

            var innerRenderer = Handsontable.renderers.TextRenderer;

            var mergeResult = mergeValuesAndFormatList(valuesAndFormatList);
            if (mergeResult.format == "HTML") {
                innerRenderer = _.bind(this.innerHTMLRenderer, this);
            }

            innerRenderer.call(this, instance, td, row, col, prop, mergeResult.stringValue, cellProperties);

            if ((this.tableData) && (this.tableData.length > 0) && (row == this.tableData.length - 1)) {
                this.lastRowRendered = true;
            }

            if (this.lastRowRendered) {
                this.lastTR = td.parentNode;
                this.lastRowRendered = false;
            }


            $(td).prop('title', this.renderTitle(mergeResult.stringValue));
            return td;
        },

        renderTitle: function(title) {
          if (!title.match(/href="([^"]*)/)) return title;

          var value = title;

          try {
            var div = document.createElement('div');
            div.innerHTML = title;
            var value = div.firstChild && div.firstChild.getAttribute("href");
          } catch (e) {
            console.log(e);
          }

          return value;
        },

        breakInput: function(e){
          e.stopPropagation();
          e.preventDefault();

          this.setEditProperties(e);
        },

        doInput: function(e){
          this.updateWithInputFieldValue(e);
        },

        keyDetection: function(e){
          e.stopPropagation();

          if (e.keyCode == 13){
            this.updateWithInputFieldValue(e);
          } else if (e.keyCode == 27){
            e.preventDefault();

            this.setEditProperties();
          }
        },

        setEditProperties: function (e) {
          this.editProperties = false;
          this.isEditing = false;
          this.table.updateSettings({columns: this.getColumns(), colHeaders:this.getColHeaders()});
          this.modelComputed();
        },

        updateWithInputFieldValue: function (e) {
          this.isEditing = false;
          e.stopPropagation();
          e.preventDefault();

          var tar = $(e.currentTarget);
          var position = tar.parents(".colHeader").find("[data-index]").attr("data-index");

          $('.ui-autocomplete').remove();

          if($('.InputField').val() == ''){
            return;
          }
          var value = $('.InputField').val();
          this.renameColumn(position, value);
        },

        headerClicked: function (e) {
          return this.startEditing(e);
        },

        AddClicked: function (e){
          this.scrollInTableRight();
          return this.startEditing(e, "addColumnWidth");
        },

        startEditing: function(e, cssClass){
          var tar = $(e.currentTarget);

          if (tar.find("input").length){
            return;
          }
          if (tar.parents('.htCore').find("input").length){
            return;
          }

          this.editProperties = true;

          e.preventDefault();
          e.stopPropagation();

          var position = tar.attr("data-index");
          var curPropertyName = tar.context.id;
          var counter = 0;
          if (cssClass) tar.parent().addClass(cssClass);

          var that = this;
          var el = $("<input type='text' class='InputField " + (cssClass || "") + "' name='"+ position +"' data-index='"+ position +"'/><span class='InputFieldEdit'><button class='icon_ok'><i class='icon-ok-sign'></i></button><button class='icon_remove'><i class='icon-remove-sign'></i></button></span>");
          el.val(this.properties[position]);
          tar.parent().html(el);

          $('.InputField').focus();
          $('.InputField').val('');

            this.table.unlisten();

            this.isEditing = true;

          var properties = _.filter(this.translatedPropertyMap, function(p, key) {
            return p.score == 10;
          })

          properties.sort(function(a,b) {
            var alabel = a.label.toLowerCase(),
                blabel =  b.label.toLowerCase();

            if ( alabel < blabel) {
              return -1;
            } else if (alabel > blabel) {
              return 1;
            }
            return 0;
          });

          el.focus().autocomplete({
            source: properties,
            selectFirst: true,
            minLength: 0,
            change: function( event, ui ) {
            },
            create: function(event, ui){
              counter+=1;
              if(counter%2){
                $(el).trigger({type: 'keypress', which: 40, keyCode: 40});
              }
            },
            focus: function(event, ui) {
              event.preventDefault();
              $(el).val(ui.item.value);
            },
            select: function( event, ui) {
              that.isEditing = false;
              var curProperty = ui.item.value;
              that.renameColumn(position, ui && ui.item && ui.item.value);
            },
            open: function(event, ui) {
              var containerWidth = that.el.clientWidth;
              var ulElWidth = $($(this).data("uiAutocomplete").menu.element)[0].clientWidth;
              var offsetUlElLeft = $($(this).data("uiAutocomplete").menu.element).offset().left;
              var offsetContainerElement = $(this).closest(".wtHolder").offset().left;

              if ( (containerWidth+offsetContainerElement) < (offsetUlElLeft+ulElWidth)) {
                var val = (offsetUlElLeft+ulElWidth)-(containerWidth+offsetContainerElement);
                $(this).data("uiAutocomplete").menu.element.css("margin-left",'-'+ val +'px');
              }

            }
          }).autocomplete("widget").addClass("handsontable-ui-autocomplete");
        },

        scrollInTableRight: function(){
          var toScroll = $('.wtHolder');
          var toScrollWidth = $('.wtHider').width();
          toScroll.scrollLeft(toScrollWidth);
        },

        renameColumn: function (position, newProperty) {
          var property = this.translatedPropertyMap[newProperty] || {
                label: newProperty,
                name: newProperty,
                ids: [ newProperty ]
              };

          if (typeof position === "undefined") {
            this.properties.push(property);
          } else {
            this.properties[position] = property;
          }


          if (this.options.application.models.exportProperties) {
            this.options.application.models.exportProperties.set({"properties": _.union(this.properties)});
          } else {
            this.table.updateSettings({columns: this.getColumns(), colHeaders:this.getColHeaders()});
            this.collection.setProperties(this.getDisplayedProperties());

            this.getPropertiesForTemplate();

            this.editProperties = false;
          }
        },

        getPropertiesForTemplate: function(){
          var curProps = ( _.map(this.properties,  function(el) { return el.ids; }) ).join();
          this.options.template.el.setAttribute("data-properties", curProps);
          if (this.editing) {
            this.edit();
          }
        },

        getColumnsForModel: function (model) {
          if (!model) return;
          return _.map(model.get("mes:summary"), function (entry) {
            return entry.id;
          });
        },

        updateTableData: function() {
          if (this.tableData == null) this.tableData = [];

          this.tableData.splice(0, this.tableData.length);

          for (var i = 0; i < this.collection.models.length; i++)
            this.tableData[i] = this.collection.models[i];

          this.tableDataLength = this.tableData.length;

          /* if (this.model.get("resultset.next_avail")) {
            this.tableData.push(new LoadMoreResultsPlaceHolder(this.loadMoreResultsPlaceHolder));
          }
          */
          return true;
        },

        update: function() {
          this.updateTranslatedPropertyMap();
          if (!this.isEditing) {
            // this.tableRendering = true;
            if (this.updateTableData() && this.table) {
              // this.collection.length = this.collection.models.length;
              this.table.render();
            }

            // this.tableRendering = false;
            // if (this.placeholderTargetEl) {
            //   this.trigger("scrollplaceholderavailable");
            // }
          }
        },

        addOne: function (model, collection, options) {
          this.update();
        },

        removeOne: function (model) {
          this.update();
        },

        render: function () {
        },

        afterSelection: function (c) {
          this.selectedModel = this.tableData[c];
        },

        getActionModel: function (e) {
          var el = e.currentTarget;
          if ($('.ht_master').has(el).length) {
            return this.selectedModel;
          } else {
            return this.model;
          }
        }

      });

      var HandsonTable = Results.extend({
          /** create the view accoring to the constructor of this.view */
          hasContent: function() { return false; },
          createView: function (options) {
            var model = this.model(options),
                view = new this.constructor.View(_.extend(
                  {},
                  options,
                  this.schema.parseAttributes(this.attributeModel.get()),
                  {
                    model: model,
                    el: this.createEl(),
                    template: this
                  }
                ));
            model.set("generate_available_properties_and_facets", true);

            this.instances.push(view);

            if (options.node) {
              _.each(options.node.children, function (childNode) {
                this.createSubView(childNode, options, model);
              }, this);
            }

            return view;
          },

        schema: new Template.Schema({
          attributes: {
            appendonscroll: {
              title: "editor_result_append_on_scroll",
              type: "boolean",
              "default": false,
              defaultValue: false
            }
          },
          inputAttributes: _.extend(
            {},
            Results.prototype.schema.inputAttributes,
            {
            view: {
              type: "reference",
              reference: "view"
            },
            properties: {
              title: "editor_table_properties",
              type: "list"
            },
            "exclude-from-translation": {
              title: "editor_table_exclude_properties",
              type: "list"
            },
            edittable: {
              title: "editor_table_allowEdit_label",
              type: "boolean",
              defaultValue: false
            },
            allowexport: {
              title: "editor_table_allowExport",
              type: "boolean",
              defaultValue: false
            },
            exportformat: {
              title: "editor_table_exportFormat",
              type: "enum",
              values: [{
                value: "application/x-ms-excel",
                text: "Excel"
              },{
                value: "text/csv",
                text: "CSV"
              }]
            }
          })
        })
      });

      HandsonTable.View = HandsonTableView;
      return HandsonTable;
  });
