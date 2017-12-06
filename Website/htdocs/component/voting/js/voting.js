/*========================================================================
* $Id: voting.js -1M 2016-03-11 18:13:13Z (local) $
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
    "api/v2/api",
    "client/resourceinfo",
    "client/application",
    "api/v2/search",
    "client/template",
    "component!base",
    "i18n/i18n",
    "jquery",
    "underscore",
    "highcharts"
   ], function(
     Templates,
     API,
     ResourceInfo,
     Application,
     Search,
     Template,
     Base,
     i18n,
     $,
     _
   ) {

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

   loadCss(ResourceInfo.scriptLocation + "../client/component/voting/css/voting.css", "voting");

  var Voting = Base.extend({

    voteUpHTML: function() {
      return "<i  class='icon-thumbs-up'></i>";
    },

    voteDownHTML: function() {
      return "<i  class='icon-thumbs-down'></i>";
    },

    initialize: function () {
      Base.prototype.initialize.apply(this, arguments);

      var that = this;
      var name = this.options.title;

      API.search.on("compute", function(model, input) {
        //console.log(input);
      });

      API.search.on("loadoutput", _.bind(function(model, atts, options) {
        if ( (atts && atts.resultset && atts.resultset.results) || (atts && atts.results) ) {
          _.each( (atts.resultset && atts.resultset.results) || atts.results, _.bind(function(result) {
            result.properties.actions && result.properties.actions.data && result.properties.actions.data.push({
              "html": "<a tabindex=\"0\" role=\"button\" data-action-object='{&quot;vote&quot;:{&quot;action&quot;:&quot;thumbs&quot;,&quot;weight&quot;:&quot;up&quot;}}'>" + this.voteUpHTML() + "</a>",
              "value": {
                "action": {
                  "upvote": {}
                }
              }
            },
            {
              "html": "<a tabindex=\"0\" role=\"button\" data-action-object='{&quot;vote&quot;:{&quot;action&quot;:&quot;thumbs&quot;,&quot;weight&quot;:&quot;down&quot;}}'>" + this.voteDownHTML() + "</a>",
              "value": {
                "action": {
                  "upvote": {}
                }
              }
            });
            result.properties.actions && result.properties.actions.properties && result.properties.actions.properties.push(
              {
                "id": "UpVote",
                "name": "UpVote",
                "data": [
                  {
                    "html": "<a tabindex=\"0\" role=\"button\" data-action-object='{&quot;vote&quot;:{&quot;action&quot;:&quot;thumbs&quot;,&quot;weight&quot;:&quot;up&quot;}}'>" + this.voteUpHTML() + "</a>",
                    "value": {
                      "action": {
                        "upvote": {}
                      }
                    }
                  }
                ]
              },
              {
                "id": "DownVote",
                "name": "DownVote",
                "data": [
                  {
                    "html": "<a tabindex=\"0\" role=\"button\" data-action-object='{&quot;vote&quot;:{&quot;action&quot;:&quot;thumbs&quot;,&quot;weight&quot;:&quot;down&quot;}}'>" + this.voteDownHTML() + "</a>",
                    "value": {
                      "action": {
                        "upvote": {}
                      }
                    }
                  }
                ]
              }
            );
          }, this));
        }}, that));

        var originalInitializeModels = Application.prototype.initializeModels;
        _.extend(Application.prototype, {

          initializeModels: function() {
            originalInitializeModels.apply(this, arguments);
            this.listenTo(this, "queryprofilerdone", this.votingDone);
          },

          closeComment: function(options) {
            var el = options.eventTarget;
            $(el.parentElement).remove();
          },

          vote: function(options) {
            var el = options.eventTarget;
            if (options.action == "setComment") {
              var comment = $(el.parentElement).find("textarea").val();
              this.options.comment = comment;
              $(el.parentElement).remove();
            } else {
              var left = el.offsetLeft - 20;
              var commentElement = '\
                <div id="commentarea" style="left:'+left+'px">\
                  <h4 data-i18n="voting_leave_reply">'+i18n('voting_leave_reply')+'</h4>\
                  <textarea rows="2"></textarea>\
                  <button class="btn" data-action-object="{&quot;closeComment&quot;:{}}" data-i18n="Cancel">'+i18n('Cancel')+'</button>\
                  <button class="btn" data-action-object="{&quot;vote&quot;:{&quot;action&quot;:&quot;setComment&quot;}}" data-i18n="voting_send">'+i18n('voting_send')+'</button>\
                </div>';
              $(commentElement).insertAfter(el.parentElement.parentElement);
            }
          },

          votingDone: function() {
            //console.log("Voting done...")
          }

        });

    }

  });

  var VotingView = new Voting();
  return Voting;
});
