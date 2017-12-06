/*=======================================================================
 * $Id: application.js 85362 2015-07-20 10:28:54Z michael.biebl $
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

define(["backbone", "underscore"], function(Backbone, _) {


function Extensions() {

}
_.extend(Extensions.prototype, Backbone.Events, {

  onceAfter: function(id, callback, ctx) {
    this.once("after:" + id, callback, ctx);
    this.trigger("register:after:" + id, callback);
  },

  registerLaterCallback: function(/*args, callback*/) {
    // the callback parameter is the last, the rest is bounded
    var args = _.toArray(arguments);
    var callback = args.pop();
    return callback.apply(this, args);
  },
  
  provide: function(event, id, that /* , restofargs*/) {
    if (arguments.length < 3) 
      return this;
    var args = _.toArray(arguments).slice(2, arguments.length);
    if (event == "after" && that && _.isFunction(that.listenTo)) {
      var callback = _.bind.apply(_, [this.registerLaterCallback, this].concat(args));
      
      // after events can be called as long as the target is still alive
      that.listenTo(this, "register:" + event + ":" + id, callback, this);
    }
    args = [event + ":" + id].concat(args);
    this.trigger.apply(this, args);
    return this;
  }

});

Extensions.instance = new Extensions();
return Extensions.instance; 

});

