/*========================================================================
* $Id: savedsearches.js 91712 2016-07-06 15:14:22Z daniel.eppensteiner $
*
* Copyright © Mindbreeze Software GmbH, Linz, Austria, 2005-2014
*
* Der Nutzer des Computerprogramms anerkennt, dass der oben stehende
* Copyright-Vermerk im Sinn des Welturheberrechtsabkommens an der vom
* Urheber festgelegten Stelle in der Funktion des Computerprogramms
* angebracht bleibt, um den Vorbehalt des Urheberrechtes genuegend zum
* Ausdruck zu bringen. Dieser Urheberrechtsvermerk darf weder vom Kunden,
* Nutzer und/oder von Dritten entfernt, veraendert oder disloziert werden.
* =========================================================================*/

define(
"component!alertedsearches",
[
  "client/template",
  "i18n/i18n",
  "component!base",
  "client/views/list",
  "api/v2/search",
  "utils/browser",
  "utils/clone",
  "utils/dom",
  "utils/url",
  "utils/mustache",
  "utils/jsonpath",
  "utils/persistedsourceinfo",
  "model/persisted_collection",
  "service/stub",
  "client/application",
  "api/v2/common",
  "utils/localStorage",
  "backbone",
  "underscore",
  "jquery",
  "api/v2/persisted",
  "service/channel",
  "service/channels",
  "api/v2/resources",
  "api/v2/search",
  "client/resourceinfo",
  "model/persisted_collection_application_extensions"
], function (
  Template,
  i18n,
  Base,
  ListView,
  Search,
  Browser,
  clone,
  dom,
  url,
  Mustache,
  JSONPath,
  PersistedSourceInfo,
  PersistedCollection,
  Stub,
  Application,
  Common,
  localStorage,
  Backbone,
  _,
  $,
  Persisted,
  Channel,
  Channels,
  Resources,
  Search,
  ResourceInfo
) {

 var AlertedSearches = Template.extend({

   initialize: function() {
    this.initializationPromise = new Channel.DeferredCallFinished();
    Template.prototype.initialize.apply(this, _.toArray(arguments));

    var userid = document.querySelector('meta[name="mes:userid"]');
    var owner = userid && userid.getAttribute("content");
    if (owner == null || owner == "$$USERID$$" || owner.length <= 0 ) owner = null;

    if (owner == null) {
      var user = document.querySelector('meta[name="mes:user"]');
      var owner = user && user.getAttribute("content");
      if (owner == null || owner == "$$USERNAME$$" || owner.length <= 0 ) owner = null;
    }

    getOrCreateAlertedSearchesModel(this.application, {
      path: ["emailalert"],
      owner: owner
    }, this);
   },

   hasContent: function () {
     return true;
   },

   model: function(options) {
     return this.application.models.alertedSearches;
   },

   createView: function(options)  {

     options = _.extend(
       this.attributeModel.getCamelCase(),
       options,
       {
         elementTemplate: this.node.children[0].template,
         datasourcetabs: this.get("datasourcetabs")
       }
     );
     delete options.node;

     return Template.prototype.createView.apply(this, [options]);
   },

   schema: new Template.Schema({
     attributes: {
       "alert-base": {
         type: "string",
         title: "client_alert_base"
       },
       "email": {
         type: "string",
         title: "client_alert_email"
       }
     }
   }),
});

  var AlertedSearchesModel = Backbone.Model.extend({

    defaults: {
      alertBase: "weekly"
    },

    validate: function (atts, options) {
      if (!atts.alertBase) return "No frequency";
      if (!atts.email) return "No email";
      if (!atts.query) return "No query";
      if (!atts.description) return "No description";
    },

    parse: function (atts) {
      var properties = Common.mapByPluck(atts && atts.property, "key");
      if (atts && properties) {
        var link = window.location.origin + window.location.pathname + "?search=" + atts.path.join("-");
        return {
          id: atts.path.join("/"),
          path: atts.path,
          email: properties.email.value,
          query: JSON.parse(atts.data),
          description: properties.description.value,
          link: link
        };
      }
    },

    toJSON: function() {
      var atts = this.attributes;
      var path = atts.path;

      if (!path) {
        path = ["emailalert", atts.alertBase];
      }

      return {
        path: path,
        data: JSON.stringify(atts.query),
        property: [{
            key: "email",
            value: atts.email
          },{
            key: "description",
            value: atts.description
        }]
      };
    },

    getUser: function() {
    if (this.attributes && this.attributes.query && this.attributes.query.user)
      return this.attributes.query.user;
    return null;
   },

    getOrderBy: function() {
    if (this.attributes && this.attributes.query && this.attributes.query.orderby)
      return this.attributes.query.orderby;
    return null;
   }

  });

  var AlertedSearchesCollection = PersistedCollection.extend({
    model: AlertedSearchesModel,
    usePaths: true,

    initialize: function (unused, options) {
      options = options || {};
      options.serviceStub = options.serviceStub || new Stub({path: "persistedresources"});
      PersistedCollection.prototype.initialize.apply(this, arguments);
      this.path = options.path;
      this.property = options.property;
      this.owner = options.owner;
    },

    parse: function(response) {
      return response.persisted_resources;
    },

    get: function (key) {
      if (key === "length") {
        if (this.models.length) return this.models.length;
        return null;
      }
      return PersistedCollection.prototype.get.apply(this, arguments);
    }

  });

  AlertedSearches.DEFAULT_TEMPLATE = '<script type="text/x-mustache-template" data-class-name="mb-line-item mb-notification-item"><span id="{{id}}" tabindex="0" role="button" class="mb-tooltip btn-link notificationItem"><h3 class="mb-text"><a href="{{link}}" data-action-name="executeAlertSavedSearch">{{description}}</a></h3><span class="alertItemIcon" data-action-object={"openSubscribeModal":{"mode":"edit","id":"{{id}}"}}><i class="icon-pencil"></i></span></span><div class="pull-right"><button class="action mb-btn-no-decor" data-action-object={"destroyAlertModel":{"id":"{{id}}"}} title="{{i18n.action_delete}}" aria-describedby="{{id}}"><i class="icon-trash"></i><span class="mb-acc">{{i18n.action_delete}}</span></button></div></script>'

  var MyListView = ListView.extend({
    setModel: function() {
      ListView.prototype.setModel.apply(this, arguments);
      if (this.model) this.listenTo(this.model, "reset", this.addAll);

    },

    addAll: function(collection, options) {
      for (var i = 0; i < collection.models.length; i++) {
        this.addOne(collection.models[i], collection, options);
      }
    }
  });

  MyListView.EntryView = ListView.EntryView.extend({
    createChildView: function (options) {
      options = _.extend(
        {
          modelType: "AlertedSearchesModel"
        },
        options
      );
      return this.options.childViewConstructor.createView(options);
    }
  });

  AlertedSearches.View = Base.extend({

    defaultOptions: {
      titleTagName: "h2"
    },

    initialize: function () {
      var that = this;
      this.options = _.extend({
         childViewConstructor: this.options.elementTemplate
      }, this.defaultOptions, this.options);

      this.titleEl = this.make(this.options.titleTagName, {
           "class": this.options.titleClassName,
           "id": "alertedSearches-title-" + this.cid
         }, this.options.title || i18n("client_notifications"))
      this.appendChild(this.titleEl);

      $(this.titleEl).attr("data-i18n", "client_notifications");

      this.$hint = this.make("small", { "class" : "mb-hint mb-email-notifications"});

      var title = this.make("span", { "data-i18n" : "alert_activate_hint"}, i18n("alert_activate_hint"));
      var icon = this.make("button", { "data-action-object":'{"openSubscribeModal": {}}' ,"class" : "btn btn-link", "data-enable-if-model-valid":"search", "disabled":"disabled", "title":"" + i18n("client_email_alert_on_change") + ""});
      $(icon).append('<i class="icon-bell"></i><span class="mb-acc">"' + i18n("client_email_alert_on_change") + '"</span>');
      this.$hint.appendChild(title)
      this.$hint.appendChild(icon)

      $(this.el).hide()
      this.appendChild(this.$hint);

      var notificationModal = this.innerHTML();
      $('body').append(notificationModal);

      //TODO if not available!!
      //this.options.application.models.sourceInfo.on("change", _.bind(function(response, path) {

        var searchPathURLParameter = Browser.getURLParameter(this.options.application.options.searchURLParameter);

        var refererURL = ResourceInfo.scriptLocation;
        var persistedChannel = "";
        var persistedResources = false;
        var that = this;

        var response = this.options.application.models.userSourceInfo;

        var serviceSource = _.keys(response.get("sources").sources)[0];
        if (!serviceSource) return;
        var services = response.get("sources").sources[serviceSource].services;

        devmode = true;
        var effective_available = false;

        _.each(services, function(service) {
          if (service.id == "persistedresources") {
            persistedResources = true;
          }
          if (service.id == "persistedcollectionschema") {
             _.find(service.options, _.bind(function (options) {
                if (options.path == "emailalert") {
                  if (options.effective_available) {
                    effective_available = true;
                  }
                }
              },this));
          }
        });

        if (persistedResources && effective_available) {
          _.each(this.options.application.models.channels.models, function(channel) {
            if ( url.sameOrigin(refererURL, channel.id) || devmode ) {
              var persistedChannel = channel;

              that.options.application.models.persistedChannel = channel;

              var persisted = new Persisted({channels: persistedChannel});
              var users = persisted.resources(
                ["user", "default"]
              );
              users.fetch({
                success: _.bind(function(response) {
                  this.options.application.models.users = response;
                }, that),
                error: function(response) {
                }
              });
              var frequency = persisted.collections(
                ["emailalert"]
              );
              frequency.fetch({
                success: _.bind(function(response) {
                  this.options.application.models.frequency = response;
                  if (response.models.length) $(that.el).show();
                }, that),
                error: function(response) {
                }
              });

              if (searchPathURLParameter) {
                var searchPath = searchPathURLParameter.split("-");
                var urlSearchAlert = persisted.resources( searchPath );
                urlSearchAlert.fetch({
                  success: _.bind(function(response) {
                    var data = response.at(0) && response.at(0).get("data");
                    if (data) {
                      $('body').removeClass("initialmode");
                      data = JSON.parse(data);
                      this.options.application.models.search.input.set(Search.SearchRequest.parse(data));
                    }
                  }, that),
                  error: function(response) {
                  }
                });
              }

            }
          });
        }

      //}, this) );

      this.options.application.executeAlertSavedSearch = this.options.application.executeAlertSavedSearch || function (options) {
        options.event.preventDefault();

        alertModel = options.sender.model;
        if (!alertModel) return;

        var rootElement = this.rootElsClone;
        if (rootElement.id) {
          var templateRefID = rootElement.id;
        } else {
          var templateRefID = rootElement;
        }

        var $templateRefID = $(templateRefID);
        $templateRefID.find("[data-template='profilesettings']").remove();

        var titel = alertModel.get("description");
        var stackTitle = "<div class='mb-stack-title-group'>\
                            "+i18n("client_notifications")+"<span>" + titel + "</span>\
                          </div>\
                          <div class='mb-stack-title-group'>\
                            <button class='btn btn-default mb-stack-close' data-action-name='updateSavedSearches'>" + i18n("save_changes") + "</button>\
                          </div>";

        this.pushStack({
          "title": stackTitle,
          "template-ref": templateRefID,
          "useCloneElement": true,
          "action": "runAlertSavedSearch",
          "applicationOptions": {
            "startSearch": false,
            "alertModel": alertModel
          }
        });

      };

      Application.prototype.runAlertSavedSearch = Application.prototype.runAlertSavedSearch || function (options) {
        var alert_query = this.options.alertModel.get("query");
        this.models.search.input.set(Search.SearchRequest.parse(alert_query));
      };

      this.options.application.updateSavedSearches = this.options.application.updateSavedSearches || function (options) {
        var alertModel = options.model && options.model.get("applicationOptions") && options.model.get("applicationOptions").alertModel;

        if (alertModel) {
          var searchInput = this.models.search.input.toJSON();

          alertModel.set("query", searchInput);
          alertModel.save(null, {
              success: _.bind(function (model, response) {
              }, this),
              error: function (model, response) {
              }
            });
        }
      };

      this.options.application.destroyAlertModel = this.options.application.destroyAlertModel || function (options) {
        var persisted = new Persisted({channels: this.models.persistedChannel});
        var alertID = options.id;

        var path = alertID.split("/");
        var alert = persisted.resources(
          path
          );
        alert.fetch({
          success: _.bind(function(response) {
            var model = options.model;
            model.trigger('destroy', model, model.collection, options);
          }, this)
        });
      };

      this.options.application.openSubscribeModal = this.options.application.openSubscribeModal || function (options) {

        var that = this;
        var el = $('#notificationModal');
        this.options.mainAlertID = options.id;
        this.setFrequency = this.setFrequency !== undefined ? this.setFrequency : true;
        var frequencyEl = el.find("select[name='frequency']");
        if (this.setFrequency) {
          _.each(this.models.frequency.models, function(modal) {
            this.modal = modal;
            _.each(modal.get("property"), function(prop) {
              if(prop.key == "displayname") {
                var option = document.createElement("option");
                option.text = i18n(prop.value) || prop.value;
                option.value = this.modal.get("path")[1];
                frequencyEl.append(option);
              }
            });
          });
          this.setFrequency = false;
        }

        var userEmail = this.models.users && this.models.users.models.length && this.models.users.models[0].get("properties").email;
        var userName = this.models.users && this.models.users.models.length && this.models.users.models[0].get("properties").user;

        if (userEmail && userName) {
          $($('#notificationModal').find("input[name='email']")).val(userEmail);
          $($('#notificationModal').find("input[name='username']")).val(userName);
          $('#notificationModal .modal-email-output').html(userEmail);
          $('#notificationModal').addClass("modal-email-available");
        }

        var persisted = new Persisted({channels: this.models.persistedChannel});

        if (options.mode == "edit") {
          var alertID = options.id;
          $('#notificationModal').find(".notificationModalHeadline span").text(i18n("client_edit_notifications"));

          var path = alertID.split("/");
          var alert = persisted.resources(
            path
          );
          alert.fetch({
            success: _.bind(function(response) {

              var model = response.models[0];

              if(model) {
                var description = model.get("properties").description;
                var alertID = model.get("id");
                var frequency = alertID.split("/")[1];
                $($('#notificationModal').find("input[name='description']")).val(description);
                $($('#notificationModal').find("input[name='alertID']")).val(alertID);
                $($('#notificationModal').find("select")).val(frequency);
                this.models.alert = model;
                var userEmail = persisted.resources(
                  ["user", "default"]
                );
                userEmail.fetch({
                  success: function(response) {
                    if (response.models.length) {
                      var email = response.models[0].get("properties").email;
                      var username = response.models[0].get("properties").user;
                      $($('#notificationModal').find("input[name='username']")).val(username);
                      $($('#notificationModal').find("input[name='email']")).val(email);
                      $('#notificationModal .modal-email-output').html(email);
                      el.modal("show");
                      $($('#notificationModal').find("input[name='description']")).focus();
                    } else {
                      $('#notificationModal').removeClass("modal-email-available");
                      el.modal("show");
                      $($('#notificationModal').find("input[name='username']")).focus();
                    }
                  }
                })
              } else {
                this.models.alertedSearches.remove(this.options.mainAlertID);
                el.modal("show");
              }

            }, this),
            error: function(response) {

            }
          });
        } else {
          $('#notificationModal').find(".notificationModalHeadline span").text(i18n("client_notifications"));
          var userEmail = persisted.resources(
            ["user", "default"]
          );
          userEmail.fetch({
            success: function(response) {
              if (response.models.length) {
                var userEmail = response.models[0].get("properties").email;
                var userName = response.models[0].get("properties").user;
                $('#notificationModal .modal-email-output').html(userEmail);
                $('#notificationModal').addClass("modal-email-available");
                $($('#notificationModal').find("input[name='email']")).val(userEmail);
                $($('#notificationModal').find("input[name='username']")).val(userName);
                $($('#notificationModal').find("input[name='description']")).val("");
                $($('#notificationModal').find("input[name='alertID']")).val("");
                el.modal("show");
                $($('#notificationModal').find("input[name='description']")).focus();
              } else {
                $('#notificationModal').removeClass("modal-email-available");
                el.modal("show");
                $($('#notificationModal').find("input[name='username']")).focus();
              }
            },
            error: function(response) {
            }
          });
        }

      };

      var emailPattern = new RegExp(/^(("[\w-+\s]+")|([\w-+]+(?:\.[\w-+]+)*)|("[\w-+\s]+")([\w-+]+(?:\.[\w-+]+)*))(@((?:[\w-+]+\.)*\w[\w-+]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][\d]\.|1[\d]{2}\.|[\d]{1,2}\.))((25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\.){2}(25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\]?$)/i);

      if (emailPattern.test(this.options.email)) {
        if(this.options.showalert === "true") {
          window.email = this.options.email;
          window.alertBase = this.options.alertBase;
          $('.alertedSearches').attr('style', 'display:block !important');
        }
      }

      this.list = new MyListView(_.extend({
        childViewConstructor: this.options.elementTemplate
      }, this.defaultOptions, this.options, {
        el: null,
        model: this.model
      }));

      this.appendChild(this.list.render().el);

    },

    innerHTML: function() {

      var html = '<div id="notificationModal" class="modal" tabindex="-1" role="dialog" aria-hidden="true" style="display:none;"> <div class="modal-header"> <h3 class="notificationModalHeadline"> <i class="icon-bell"></i> <span>' + i18n("client_email_alert_on_change") + '</span> </h3> </div><div class="modal-body"> <div class="mb-flexbox"> <div class="mb-line-item notificationUserName"> <label class="pull-left"><span>*' + i18n("Username") + ':</span></label> <input class="" type="text" name="username"> </div><div class="mb-line-item notificationEmail"> <label class="pull-left"><span>*' + i18n("Email") + ':</span></label> <input class="" type="email" name="email"> </div><div class="mb-line-item"> <label class="pull-left"><span>*' + i18n("client_description") + ':</span></label> <input class="" type="text" name="description"> </div><div class="mb-line-item"> <label class="pull-left frequency"><span>' + i18n("client_alert_base") + ':</span></label> <select name="frequency"></select> </div><input class="hidden" type="text" name="alertID"> </div></div><div class="modal-footer"> <span class="modal-email-footer modal-email-output"></span> <button class="btn btn-noShadow" data-dismiss="modal">' + i18n("Close") + '</button> <button class="mb-next mb-pulse action btn btn-default" data-action-name="subscribeSearchForAlert">' + i18n("Save") + '</button> </div></div>';
      return html;
    }

  });


  function getOrCreateAlertedSearchesModel(application, options, that) {

    function triggerDone(template) {
      template.initializationPromise.triggerDone();
    };

    if (!application.models.alertedSearches) {
      application.models.alertedSearches = new AlertedSearchesCollection(null, {
          channels: application.models.defaultChannels,
          appid: application.appid,
          path: options.path,
          owner: options.owner
      });

      function fetchData(application, usersourceinfo) {

        var serviceFound = false;
        var pathFound = false;

        _.find(usersourceinfo.get("sources").sources, _.bind(function(source) {
          _.find(source.services, _.bind(function(service) {
            if (service.id == "persistedcollectionschema") {
              serviceFound = true;
              _.find(service.options, _.bind(function (options) {
                if (options.path == "emailalert") {
                  pathFound = true;
                  if (options.effective_available) {

                    application.models.alertedSearches.fetch({
                      success: _.bind(function(response) {
                        triggerDone(this);
                      }, that),
                      error: _.bind(function(response) {
                        triggerDone(this);
                      }, that)
                    });

                  } else {
                    triggerDone(that);
                  }
                }
              }, application))
              if (!pathFound) triggerDone(that);
            }
          }, application));
          if (!serviceFound) triggerDone(that);
        }, application));
      };

      var sources = application.models.userSourceInfo.get("sources") && application.models.userSourceInfo.get("sources").sources;
      if (sources) {
        _.each(sources, _.bind(function(source) {
          setTimeout(_.bind(function() {
            fetchData(this, this.models.userSourceInfo);
          }, this), 100);
        }, application))
      }

      function getSourceInfo(usersourceinfo) {
        var sources = usersourceinfo.get("sources") && usersourceinfo.get("sources").sources;
        if (sources) {
          _.each(sources, _.bind(function(source) {
            fetchData(this, usersourceinfo);
            that.stopListening(application.models.userSourceInfo, "change", getSourceInfo);
          }, application))
        }
      };

      var user_source_info = application.models.userSourceInfo;
      that.listenTo(user_source_info, "change", getSourceInfo);

    } else {
      triggerDone(that);
    }

    if (!application.subscribeSearchForAlert) {
      application.subscribeSearchForAlert = function (options) {

        var email = $($('#notificationModal').find("input[name='email']")).val();
        var description = $($('#notificationModal').find("input[name='description']")).val();
        var frequency = $($('#notificationModal').find("select")).val();
        var username = $($('#notificationModal').find("input[name='username']")).val();

        if (!email || !description || !frequency || !username) return;

        var alertID = $($('#notificationModal').find("input[name='alertID']")).val();
        $($('#notificationModal').find("input[name='alertID']")).val("");

        var persisted = new Persisted({channels: this.models.persistedChannel});

        if (alertID.length) {
          var alertModel = this.models.alert;
          var alertModelFrequency = alertModel.get("path")[1];
          this.oldQuery = JSON.parse(alertModel.get("data"));

          if (alertModelFrequency != frequency) {
            this.frequencyChanged = true;
          }

          this.models.alertedSearches.remove(alertModel);

          var userEmail = persisted.resources(
            ["user", "default"]
          );

          userEmail.fetch({
            success: _.bind(function(response) {
              if (response.models.length) {

                  var subscription = new AlertedSearchesModel({
                    email: email,
                    alertBase: frequency,
                    description: description,
                    query: this.oldQuery
                  });
                  this.models.alertedSearches.add(subscription);

              } else {
                this.models.users.add({
                  properties: {
                    user: username,
                    email: email,
                    active: "true"
                  }
                });
                var subscription = new AlertedSearchesModel({
                  email: email,
                  alertBase: frequency,
                  description: description,
                  query: this.oldQuery
                });
                this.models.alertedSearches.add(subscription);
              }
            }, this),
            error: function(response) {
            }
          })
        } else {

          var emailExists = false;
          var userEmail = persisted.resources(
            ["user", "default"]
          );
          userEmail.fetch({
            success: _.bind(function(response) {
              if (response.models.length) {
                var subscription = new AlertedSearchesModel({
                  email: email,
                  alertBase: frequency,
                  description: description,
                  query: this.models.search.input.toJSON()
                });
                this.models.alertedSearches.add(subscription);
              } else {
                this.models.users.add({
                  properties: {
                    user: username,
                    email: email,
                    active: "true"
                  }
                });
                var subscription = new AlertedSearchesModel({
                  email: email,
                  alertBase: frequency,
                  description: description,
                  query: this.models.search.input.toJSON()
                });
                this.models.alertedSearches.add(subscription);
              }
            }, this),
            error: function(response) {
            }
          });

        }

        $('#notificationModal').modal("hide");
        $($('#notificationModal').find("input")[0]).val("");
        $($('#notificationModal').find("input")[1]).val("");
        $($('#notificationModal').find("input")[2]).val("");

      }
    }

    return application.models.alertedSearches;
  }
  return AlertedSearches;
});
