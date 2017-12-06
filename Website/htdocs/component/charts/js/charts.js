/*========================================================================
* $Id: piechart.js -1M 2016-03-11 18:13:13Z (local) $
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
    "client/templates",
    "api/v2/search",
    "client/template",
    "component!base",
    "i18n/i18n",
    "jquery",
    "underscore",
    "highcharts"
   ], function(
     Templates,
     Search,
     Template,
     Base,
     i18n,
     $,
     _
   ) {

  var Chart = Template.extend({
    schema: new Template.Schema({
      inputAttributes: {
        chartTitle: {
          title: "editor_chart_title",
          type: "string"
        },
        /*
        chartSource: {
          title: "editor_chart_source",
          type: "enum",
          defaultValue: "facets",
          "default": "facets",
          values: [{
            value: "facets",
            text: "Filter"
          }]
        },
        chartSourceCount: {
          title: "editor_chart_source_count",
          type: "string",
          defaultValue: "1",
          "default": "1",
          values: [{
            value: "1",
            text: "1"
          },{
            value: "2",
            text: "2"
          },{
            value: "3",
            text: "3"
          }]
        },
        */
        chartSourceName: {
          title: "editor_chart_source_name",
          type: "enum",
          values: {
             bind: {
               options: "available_facets",
               value: "name",
               text: "localized_name"
             }        
          }
        },
        enableCustomSourceName: {
          title: "editor_enable_custom_sourcename",
          type: "boolean",
          defaultValue: false,
          "default": false
        },
        customSourceName: {
          title: "editor_custom_sourcename",
          type: "string",
          depends: ""
        },
        /*
        chartSourceName2: {
          title: "editor_chart_source_name",
          type: "enum",
          values: {
             bind: {
               options: "available_facets",
               value: "name",
               text: "localized_name"
             }           
          },
          depends: "attributes['chartsourcecount'] >= '2'"
        },
        chartSourceName3: {
          title: "editor_chart_source_name",
          type: "enum",
          values: {
             bind: {
               options: "available_facets",
               value: "name",
               text: "localized_name"
             }           
          },
          depends: "attributes['chartsourcecount'] >= '3'"
        },
        */
        chartheight: {
          title: "editor_chart_height",
          type: "int"
        },
        titlealign: {
          title: "editor_title_align",
          type: "enum",
          values: [{
                value: "center",
                text: "Center"
              },{
                value: "left",
                text: "Left"
              },{
                value: "right",
                text: "Right"
            }]
        },
        showlegend: {
          title: "editor_show_legend",
          type: "boolean",
          defaultValue: false,
          "default": false,
          depends: "'pie' === attributes['charttype']"
        }
      }
    }),

    getOptions: function (options) {
      options = _.extend(
        {},
        Template.prototype.getOptions.apply(this, arguments),
        this.attributeModel.get()
      );
      return this.schema.parseAttributes(options);
    }
  });

  Chart.View = Base.extend({

    initialize: function () {
      Base.prototype.initialize.apply(this, arguments);

      var that = this;
      var name = this.options.enablecustomsourcename == "true" ? this.options.customsourcename : (this.options.chartsourcename || this.options.chartSourceName); 
      var name2 = this.options.chartsourcename2 || this.options.chartSourceName2; 
      var name3 = this.options.chartsourcename3 || this.options.chartSourceName3; 
      var source = this.options.chartsource || this.options.chartSource;
      this.name = name;
      this.source = source;


      if (this.source == "facets2") {

        this.name = "filter_" + name + "_" + name2;
        this.model.set("computed_properties",
            [{"name": this.name, "expr": 'concat(' + name + ',";",' + name2 + ')'}]     
            // [{"name": this.name, "expr": name}]     
            ,{silent: true});
      }

      var facets = {};
      facets[this.name] = {format: "HTML"};   
      var facetRegistriation = {
        cid: _.uniqueId('c'),
        facets: facets,
        name: this.name,
        properties: {
          count: {format: "PROPERTY"},
          excluded: {format: "PROPERTY"},
          html: {format: "HTML"},
          showAddAnd: {format: "PROPERTY"},
        },
        setView: function() {},
        clear: function() {},
        stopListening: function() {}
      };
      this.facetRegistriation = facetRegistriation;
      if (this.model.addFacet && (this.facetRegistriation.cid !== undefined)) this.model.addFacet(this.facetRegistriation, { silent: false });

      this.constraintsModel = this.model.input.submodel("user.constraints");

      this.listenTo(this.model, "change", this.render);

      $(window).resize(_.bind(function() {
        if (this.$el.highcharts()) {
          this.$el.highcharts().reflow();
        }
      }, this));

    },

    renderFacets: function() {      
      var entries = this.model.get("entries") || this.model.get(["facets", this.name, "entries"]);

      entries = _.uniq(entries, function(item) { return item.html; });

      var that = this;
      var type = this.options.charttype;
      var chartTitle = this.options.charttitle || null;
      var chartWidth = this.options.chartwidth;
      var chartHeight = this.options.chartheight;
      var titleAlign = this.options.titlealign;
      var yAxisTitleText = this.options.yaxistitletext;
      var showInLegend = this.options.showlegend || false;
      var isPie = type == "pie";

      if (!entries || !entries.length) {
        this.$el.hide();
        return;
      }
      this.$el.show();

      var resultMap = {};
      var options = {
          title: {
            text: chartTitle,
            align: titleAlign || "center"
          },
          chart: { 
            type: type,
            height: chartHeight || 200,
            width: chartWidth || null,
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false,
            spacingBottom: 10,
            spacingTop: 0,
            spacingLeft: 0,
            spacingRight: 0,
            marginTop: 30
          },
          yAxis: {
              title: {
                  text: yAxisTitleText || 'Count'
              },
              plotLines: [{
                value: 0,
                width: 1,
                color: '#808080'
              }]
          },
          credits: false,
          plotOptions: {
            pie: {
              allowPointSelect: true,
              animation: false,
              cursor: 'pointer',
              dataLabels: {
                enabled: false,
              },
              showInLegend: showInLegend,
              point: {
                events: {
                  click: function(event) {
                    var color = this.color;
                    var item = entries[this.index];
                    var filterID = item.query_expr.label ? ("filter_" + item.query_expr.label) : _.uniqueId("cid");

                    var filtered = {};
                    _.each(entries, function(entry) {
                      var query_expr = entry.query_expr;
                      filtered[query_expr.id] = query_expr;
                    });
                    var filterbase = {};
                    filterbase[0] = item.query_expr;

                    var filterExpr = {
                      label: item.query_expr.label,
                      filtered_name: item.query_expr.label,
                      filtered: filtered,
                      id: filterID,
                      filter_base: filterbase
                    };

                    this.userConstraintInput = that.model.input.submodel("user.constraints");
                    if ( (this.userConstraintInput.get(filterID) &&  this.userConstraintInput.get(filterID).filter_base[0].id) != this.name ) {
                      this.userConstraintInput.set(filterID, filterExpr);
                    } else {
                      //unset one filter only
                      this.userConstraintInput.unset(filterID, options);
                    }

                  }
                },
              }
            },
            bar: {
              point: {
                events:{
                  click: function() {
                    //console.log(entries[this.index]);
                  }
                }
              }
            },
            column: {
              point: {
                events:{
                  click: function() {
                    //console.log(entries[this.index]);
                  }
                }
              }
            },
            line: {
              point: {
                events:{
                  click: function() {
                    //console.log(entries[this.index]);
                  }
                }
              }
            }
          }
      };

      for (var i = 0; i < entries.length; ++i) {
        resultMap[entries[i].html] = {count: entries[i].count, value: entries[i].value, name: entries[i].html};
      }

      var names = _.filter(_.keys(resultMap), function(name) { return resultMap[name] && resultMap[name].count != null; });
      var series = [];
      if (isPie) {
        var data = [];

        for (var i = 0; i < names.length; ++i) {
          data.push({name: names[i], y: resultMap[names[i]].count})          
        }
        series.push({
          name: chartTitle,
          data: data
        });
      }
      else {
        var seriesElement = {name: chartTitle};                    
        seriesElement.data =_.map(names, function(name) { return resultMap[name].count; });

        series.push(seriesElement);

        options.xAxis = {
            categories: names
        };
      }  
      options.series = series;

      $(this.el).append("<div class='mb-highcharts'></div>");
      $(this.el).find('.mb-highcharts').highcharts(options);    
    },

    render: function () {
      return this.renderFacets();
    },

    remove: function () {
      if (this.constraintsModel) this.constraintsModel.dispose();
      this.el.innerHTML = "";
      if (this.model.removeFacet) this.model.removeFacet(this.facetRegistriation);
      if ( this.$el.highcharts() !== undefined ) this.$el.highcharts().destroy();
      Base.prototype.remove.apply(this, arguments);
    }

  });

  Templates.add({
      name: "charts",
      weight: 7,

      attributes: {
        size: {
          title: "Title",
          type: "string",
          defaultValue: "charts"
        }
      },

      designer_menu: [{
          name: "editor_pie_title",
          icon: "../img/imgpiechart.png",
          group: {
            name: "Charts"
          },
          options: {
            charttype: "pie",
          }
      },{
          name: "editor_bar_title",
          icon: "../img/imgbarchart.png",
          group: {
            name: "Charts"
          },
          options: {
            charttype: "bar",
          }
      },{
          name: "editor_line_title",
          icon: "../img/imglinechart.png",
          group: {
            name: "Charts"
          },
          options: {
            charttype: "line",
          }
      }]
    });

  return Chart;
});

