
* Beschreibung

- wird von View instanziiert und mit dem Results Modell verkabelt
- Im SearchModel gibt es nur eine Instanz des Results (in einer View) - auf Pfadebene
- je Results Block existiert eine separate Instanz, die das Results Modell beeinflusst und verwendet
- Bietet Editierfunktionalitaet fuer das Einbetten von Darstellungskomponenten wie unten am Beispiel
- Stellt eine Liste von Elementen dar
- Je Element wird erkannt welche (mehrere) Darstellungskomponenten und verwendet diese zur Darst

 <div data-binding="results" >     
       <script type="text/x-mustache-template" data-binding="result">
            <div>{{{title}}}</div>
            {{{content}}}            
        </script>
        <script type="text/x-mustache-template" data-component="rendering" data-="">
            <img src="{{mes:thumbnailurl}}"/>                
        </script>               
 </div>
