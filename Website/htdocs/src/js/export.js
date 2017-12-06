/*========================================================================
* $Id: editor.js 97320 2017-04-07 11:14:01Z michael.biebl $
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
  "service/stub",
  "client/application",
  "utils/persistedsourceinfo",
  "utils/clone",
  "i18n/i18n",
  "jquery",
  "underscore",
  "backbone",
  "utils/uuid"
], function (
  Stub,
  Application,
  PersistedSourceinfo,
  clone,
  i18n,
  $,
  _,
  Backbone,
  UUID
) {
  var PATH = ["queryexports", "default"];

  var queryexportAvailable = {};

  function execute(apiPath/*: string*/, channels/*: Channels*/, request, success/*: function*/, error/*: function */) {
    var serviceStub = new Stub({path: apiPath});
    var responseObserver = {};

    _.extend(responseObserver, Backbone.Events);
    var numberOfChannels = channels.length;
    var finished = 0;

    responseObserver.on("response", function (response, channel) {
        finished++; if (finished >= numberOfChannels) responseObserver.off();
        success && success.apply(this, arguments);
    });
    responseObserver.on("error", function () {
        finished++; if (finished >= numberOfChannels) responseObserver.off();
        error && error.apply(this, arguments);
    });
    serviceStub.cast(channels, request, responseObserver);
  }

  function available(application, channels, success, error) {
    channels.each(function (channel) {
      channel = channel.clone();
      var id = channel.get("id");
      var available = queryexportAvailable[id];

      var persistedresourcesfound = PersistedSourceinfo.persistedcollectionschemaAvailable("queryexports", application, true);

      if (persistedresourcesfound) {
        success && success({ status: { success: true } }, channel);
      } else {
        error && error({ status: { success: false } }, channel);
      }

    });
  }

  function create(channels/*: Channels*/, data/*: string*/, success/*: function*/, error/*: function */) {
    execute("persistedresources", channels, {
      create: {
        path: PATH,
        data: data
      }
    }, success, error);
  }

  function checkRequest(channel, path, task, that) {
    execute("persistedresources", channel, {
      read: {
        path: path
      }
    }, function(response) {
      var status = _.find(response.persisted_resources[0].property, function(prop) { return prop.key == "status" });
      if (!status) {
        setTimeout(function() { checkRequest(channel, path, task, that); }, 5000);
      } else {
        if (status.value == "SUCCESS") {
          task.finish();
        } else {
          task.stop("", {status: status.value});
        }
      }
      if (!$('.mb-export-is-running').length) that.removeExportDownloadBlinker();
    }, function(response) {});
  }

  function runExport(exportRequest, runner) {
    var loaderLeft =  $('.loaderLeft');
    loaderLeft.show();

    if($('.mb-no-export-results').length){
      loaderLeft.empty();
    }

    var that = this;
    var exportService = this.api.exportsearch.createStub();
    var channels = this.models.search.wiring.channel;

    var task = this.models.tasks.push({id: exportRequest.id, name: i18n("results_exportSearch"), currentTime: exportRequest.currentTime, searchQuery:exportRequest.searchQuery});

    task.start();

    task.on("change:cancelled", function(task, tasks, options) {
        if (task.isCancelled()) {
          var cancelRequest = _.clone(exportRequest);
          cancelRequest.cancel_pending = true;
          exportService.cast(channels, cancelRequest, null);
          // TODO: abort download???
          task.destroy();
          if (!$('.mb-export-is-running').length) that.removeExportDownloadBlinker();
        }
    });

    runner.call(this, task, exportService);
  }

  function runQueryExport(response, channel) {
    return function (task) {
      var that = this;
      var serviceStub = new (Stub.extend({
            call: function (channel, request, responseObserver) {
              if (_.isFunction(channel.prepareRequest)) {
                request = _.clone(request);
                channel.prepareRequest(request);
              }

              return channel.call("export?resource_path=" + response.persisted_resources[0].path.join("/"), request, responseObserver, {}, null, { method: "download" });
            }
      }))();

      var taskresponse = response;
      var responseObserver = {};
      _.extend(responseObserver, Backbone.Events);
      responseObserver.once("response", function (response, channel) {

        var checkRequestPath = taskresponse.persisted_resources[0].path;
        checkRequest(channel, checkRequestPath, task, that);        

      });
      serviceStub.cast(channel, {}, responseObserver);
    };
  }

  function runDirectExport(exportRequest, channel) {
    return function (task, exportService) {
      var that = this;
      var promise = exportService.cast(channel, exportRequest);

      promise.always(function() {
          if (task.isRunning()) {
            task.finish();
            if (!$('.mb-export-is-running').length) that.removeExportDownloadBlinker();
          }
      });
    };
  }

  if (!Application.prototype.exportSearch) {
    _.extend(Application.prototype, {

        exportSearch: function(options, traceContext) {
          options = options || {};
          var searchRequest = this.models.search.input.toJSON();
          var currentTimestamp = moment();
          var currentTime = currentTimestamp.format("HH:mm");
          var id = _.uniqueId();
          //TODO searchQuery.user = undefined?!
          var searchQuery = searchRequest.user && searchRequest.user.query.and[0].unparsed;

          if (options.properties) {
            searchRequest.properties = options.properties;
          }

          var excludePropertiesFromTranslation = this.options.excludeFromTranslation;

          _.each(excludePropertiesFromTranslation, _.bind(function(prop) {
            _.find(searchRequest.properties, function(val) {
              if (val.name == prop) {
                val.localized_name = prop
              }
            });
          }, this));

          var exportRequest = {
            search_request: searchRequest,
            id: searchQuery + '_' + currentTime + '_' + UUID.generate(),
            currentTime: currentTime,
            searchQuery:searchQuery
          };

          if (options.exportFormat !== 'undefined') exportRequest.export_format = options.exportFormat;

          available(this,
            this.models.channels,
          _.bind(function (response, channel) {
            create(channel, JSON.stringify(exportRequest), _.bind(function (response, channel) {
              var channelID = channel.id;
              var persistedresourcesfound = false;

              var persistedresourcesfound = PersistedSourceinfo.persistedcollectionschemaAvailable("queryexports", this, true);

              if (persistedresourcesfound) {
                runExport.call(this, exportRequest, runQueryExport(response, channel));
              } else {
                // xls export is not save the old way
                exportRequest.export_format = "text/csv";
                runExport.call(this, exportRequest, runDirectExport(exportRequest, channel));
              }

            }, this));
          }, this),
          _.bind(function (response, channel) {
            // xls export is not save the old way
            exportRequest.export_format = "text/csv";
            runExport.call(this, exportRequest, runDirectExport(exportRequest, channel));
          }, this));
        },

        cancel: function(options) {
          options.model.cancel();
          if (!$('.mb-export-progress').length) {
            this.hideExportDownload();
          }
        },

        deleteExportEl: function(options){
          options.model.destroy();
          this.isTaskExporting();
        },

        isTaskExporting: function(){
          if(!$('.mb-export-finished').length) {
            this.hideExportDownload();
          }
        },

        hideExportDownload: function() {
          $('.loaderLeft').hide();
          $('.showExportList').css("color","#808080");
          this.removeExportDownloadBlinker();
        },

        removeExportDownloadBlinker: function() {
          $('.showExportList').removeClass("exportDownloaderBlink");
        },

        showExports: function(){
          $('.loaderLeft').toggle();
          if(!$('.mb-export-finished').length){
            $('.loaderLeft').html('<span class="mb-no-export-results"><b>' + i18n('no_exports_available') + '</b></span>');
          }
        }
    });
  }

});
