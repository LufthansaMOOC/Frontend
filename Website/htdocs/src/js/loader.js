define([
  "client/application",
  "service/channels",
  "api/v2/resources",
  "utils/browser",
  "jquery",
  "underscore"
], function(
  Application,
  Channels,
  Resources,
  browser,
  $,
  _
) {

  var Loader = {};
  function cleanSnippet(snippet) {
    return snippet && 
      snippet
      .replace(/[^"]*:8443\/editor\/[^\/]*\//g, "")
              .replace(/<script[^>*]src="[^"]*client.js[^"]*"[^>]*>[^<]*<\/script>/, "");
  }
  Loader.loadAppFromResource = function(options, additionalAppOptions) {
    // if
    var options = options || {},
        appid = options.appid,
        targetSelector = options.target,
        sourceURL = options.sourceURL;
    
    var hasSourceURL = sourceURL != null;
    var sources = [ (sourceURL || (Application.scriptLocation + "../..")) + "/api/v2/"];
    var fileName = "../../../resource/app_" + appid + "_snippet.html";
    var startApp = options.startApp !== false;

    var appOptions = {};
    if (hasSourceURL) {
      appOptions.sources = sources;
    }
    appOptions = _.extend(appOptions, additionalAppOptions);
    
    var channels = new Channels(sources, {trace: false});
    var res = new Resources.ServiceFactory();
    res.get(fileName, function(data, errors) {
      if (data) {
        var snippet = cleanSnippet(data)
        $(targetSelector).replaceWith(snippet);
        if (startApp) {
          new Application(appOptions);
        }
      }                                                                                     
    }, channels);
  }
  
  return Loader;
  
});
