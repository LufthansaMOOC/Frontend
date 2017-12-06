/*========================================================================
* $Id: main.js 74835 2013-09-05 20:50:30Z jakob.praher $
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

  // if loaded main.js relative from ../../main.html the toUrl("main.js") is script (src/js/main.js)
  // we could use this information as well, in this case we know the location of the index.html in the source
  // tree.
  var basePath = "apps/",
      baseUrl = "",
      libPath = "../lib/";

  if (require.isBrowser) {
    // console.log(require.toUrl("../../../"));
    // baseUrl = require.toUrl("/../../") + "src/js/"; // we are in apps/client;
    baseUrl = require.toUrl("../src/js/");
    basePath = "../../";
    libPath  = basePath + "lib/";
  }

  // this is relative to the index.html

  require.config({

    baseUrl:  baseUrl,

    paths: {
      // this is relative to the baseUrl
      "apiService":     basePath + "../../../api/v2",

      "client":     basePath + "client/src/js",
      "libs":       libPath,

      // component is a plugin for loading components
      "component":  "utils/requirejs_plugin_component",
      "editor":     "utils/requirejs_plugin_editor",

      // components is the internal path to the components used by component
      "components":  basePath + "client/component/",
      "editors":     basePath + "client/editor/",

      "text": libPath + "text",

      "backbone" :  libPath + "backbone",
      "underscore": libPath + "underscore",
      "mustache":   libPath + "mustache",

      "jquery": libPath + "jquery",      
      "jquery-ui-autocomplete": libPath + "jquery-ui-1.10.3.custom",
      
      "bootstrap": libPath + "bootstrap.min"

    },
    // For development
    urlArgs: "bust=" + (new Date()).getTime(),


    shim: {
      "backbone": {
        deps: ["underscore"],
        exports: "Backbone"
      },
      "underscore": {
        exports: "_"
      }
    }
  }
);

// return (function() {
define(["client/application"], function(Application) {
    return new Application();
});
