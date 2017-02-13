var mapajs =null;
var capaKML = null;
var capaJSON = null;
$(document).on("pagechange", function (e, data) {
  	  	if (($.type(data.toPage) == "object")
  	  		&& (data.toPage[0].id=="mapa")) {
  	  			bbox = mapajs.getBbox()
	  			mapajs.getMapImpl().updateSize();
	  			mapajs.setBbox(bbox);
	 	}
});

$(document).ready(function() {
	if( window.isApp ) {
		document.addEventListener("deviceready", onDeviceReady, false);
    } else {
        onDeviceReady();
    }
});
function onDeviceReady() {
	document.addEventListener("backbutton", onBackButton, false);
}
function onBackButton(){
	page = $.mobile.pageContainer.pagecontainer('getActivePage').attr('id');
	switch(page) {
	    case 'inicio':
	        navigator.app.exitApp();
	        break;
	    case 'mapa':
	        atrasMapa(page);
	        break;
	    default:
	        atras(page);
	}
}

function loading(showLoading){
	if(showLoading){
		$.mobile.loading( "show",{});
	}else{
		$.mobile.loading( "hide",{});
	}
}

function geolocalizar(){
	if (navigator.geolocation) {
		  var successFunction = function(position){
			  coor_x = position.coords.longitude;
			  coor_y = position.coords.latitude;
			  idEntidad = null;
			  loading(false);
			  cargarCategoria();
		  };
		  var errorFunction = function(){
			  alert("Se ha producido un error al geolocalizar");
			  loading(false);
		  };
		  loading(true);
		  navigator.geolocation.getCurrentPosition(successFunction, errorFunction);
		} else {
		  alert("El navegador utilizado no soporta la geolocalización");
		}
}

function cargarCategoria(cat){
	var requestParam = "";
	if(cat != null){
		requestParam = "?id_categoria=" + cat.id;
		pilaCategorias.push(cat);
	}else{
		requestParam = "?id_aplicacion=" + aplicacion.id;
	}
	$("#contenidoCategorias").html("");
	$.mobile.changePage("#categorias");
	loading(true);
	$.ajax({
		 url: url + "/categorias" + requestParam ,
	     type: "GET",
	     cache: true,
	     dataType: "json"
	 }).done(function(categoriasList){
	     	//cat==null->estamos en la primera categoría.
	     	categoriasList = $.grep(categoriasList, function(value) {
			  return (cat!=null? true :
	    		 	   coor_x!=null? true: //entrada por "Cerca de mí"
	    		 					!(/equipamiento/i).test(value.name));
			});
	     	categoriasList.sort(sort_by('name', false));


	    	if (cat==null && categoriasList.length===1){
	    	 	cargarCategoria(categoriasList[0]);
	    	 	pilaCategorias = [];
	    	 }else{
	    	 	 htmlElements = [];
	    		 for(i=0;i<categoriasList.length;i++){

	        		 if(!categoriasList[i].last){
			    		 htmlElements.push("<li><a href='javascript:cargarCategoria(" + JSON.stringify(categoriasList[i]) + ")'>" +
			    				 "<img width='80px' height:'80px' src='" + url+ "/categorias/" + categoriasList[i].id + "/logo/" + "'/>" +
			    				 categoriasList[i].name +
			    		 "</a></li>");
			    	 }else{
			    		 htmlElements.push("<li><a href='javascript:cargarDatos(" + JSON.stringify(categoriasList[i]) + ")'>" +
			    				 "<img width='80px' height:'80px' src='" + url+ "/categorias/" + categoriasList[i].id + "/logo/" + "'/>" +
			    				 categoriasList[i].name +
			    		 "</a></li>");
			    	 }
	    		 }

		    	 htmlElements = "<ul id='listaCategorias' data-role='listview'>" + htmlElements.join(" ") + "</ul>";
		    	 $("#contenidoCategorias").append(htmlElements);
		    	 $("#listaCategorias").listview();
           $("#titleCategorias").html(cat.name);
	    	}
     }).fail(function(){
 		 alert("Se ha producido un error al obtener las categorias");
 	 }).always(function(){
 	 	loading(false);
 	 });

}


function cargarDatos(cat){
	//console.log(cat);
	pilaCategorias.push(cat);
	datos.offset = 0;

    $("#titleDatos").html(cat.name);
	$("#listaDatos").html("");
	$.mobile.changePage("#datos");
	paginarDatos(cat);
}

function paginarDatos(cat){
//JGL12022015 - cambio para poder no usar paginación
	var requestParam = "";
	if(idEntidad!=null){
		showDistance = false; //JGL - en búsquedas por categoría no mostramos la distancia
		requestParam += "?id_entidad=" + idEntidad;
	}else{
		showDistance = true;
		requestParam += "?x=" + coor_x + "&y=" + coor_y;
	}
	if (datos.limit!=-1){
		requestParam += "&limit=" + datos.limit + "&offset=" + datos.offset;
	}
//JGL12022015
	loading(true);
	$.ajax({
		 url: url + "/datos/"+ cat.id + requestParam ,
	     type: "GET",
	     cache: true,
	     dataType: "json",
	     success: function(datosList){
	     	if(requestParam.indexOf('x')<0){ //si no es "cerca de mí"
		  		datosList.sort(sort_by('name',false, function(a){return a.toUpperCase()}));
	       	}
	    	 var i = 0;
	    	 var length = datosList.length;
	    	 if(length==0){
	    		 if(datos.offset==0){
	    			 alert("No hay datos para el filtro aplicado");
	    			 loading(false);
	    			 return;
	    		 }else{
	    			 alert("Ya no hay mas datos para este filtro");
	    		 }
	    	 }

	    	 //eliminamos el botón de cargando
	    	 if(datos.offset!=0){
	    		 $("#listaDatos li").last().remove();
    			 //$("#listaDatos li").last().css("height");
    			 //$("#listaDatos li").last().css("height","20px");
	    	 }

			 var htmlElements = [];
			 for(i;i<length;i++){
				 var liHtml = "<li><a href='javascript:verDato("+ cat.id + "," + JSON.stringify(datosList[i]) + ")'>";

				 liHtml += "<div class='listaDistancia'>"+datosList[i].name+"</div>";
				 if(showDistance && datosList[i].distance){
					 var distance = datosList[i].distance;
					 if(distance < 1000){
						 distance += " m";
					 }else{
						 //pasamos a km
						 distance = distance/1000;
						 //redondeamos con 1 decimal
						 distance = Math.round(distance * 10) / 10;
						 distance += " km";
					 }
					 liHtml += "<span class='ui-li-count'>" + distance + "</span>";
				 }
				 liHtml += "</a></li>";
	    		 htmlElements.push(liHtml);
	    	 }
			if (datos.limit!=-1){//JGL
			 htmlElements.push("<li><a href='javascript:paginarDatos(" +  JSON.stringify(cat) + ")'>" + "Obtener mas datos" + "</a></li>");
			}
		 $("#listaDatos").append(htmlElements);
	    	 $("#listaDatos").listview("refresh");

		if (datos.limit!=-1){//JGL
		    	 //estilos para el obtener mas datos
		    	 var botonObtenerMasDatos =  $($("#listaDatos li a").last()[0]);
		    	 botonObtenerMasDatos.removeClass("ui-btn-icon-right");
		    	 botonObtenerMasDatos.removeClass("ui-icon-carat-r");
		    	 botonObtenerMasDatos.css("color","#aaa");
		    	 botonObtenerMasDatos.css("text-align","center");
		}


	    	 datos.offset += datos.limit;
	    	 loading(false);
	     },
	 	 error: function(){
	 		 alert("Se ha producido un error al obtener los datos");
	 		 loading(false);
	 	 }
	  });
}

function verDato(idCategoria,dato){

  	bbox = ol.proj.transformExtent([dato.minX,dato.minY,dato.maxX,dato.maxY],
									'EPSG:4326', mapajs.getProjection().code);


  	capaKML = new M.layer.KML(generarCapaKML(idCategoria,dato.pkValue));

  	mapajs.addKML(capaKML);
  	capaKML.getImpl().getOL3Layer().getSource().on('addfeature', function(e) {
  			f=e.feature.clone(); //clono para no modificar la etiqueta
  			f.set('name', 'Información');
  			capaKML.getImpl().selectFeatures([f]);
  		});


  	mapajs.setBbox(bbox);
  	$.mobile.changePage("#mapa");
}

//genera sintaxis para crear una capa KML en mapea
function generarCapaKML(idCategoria,idDato){
	var capaKML = "KML*capaKML*" + url + "/datos/kml/" + idCategoria + "/item/" + idDato + "*true";
	return capaKML;
}

//funcion de entrada
function init(){
	loading(true);

	$.ajax({
		 url: url + "/application/" + idAplicacion,
	     type: "GET",
	     cache: true,
	     dataType: "json",
	     success: function(app){
	    	 aplicacion = app;
	    	 if(aplicacion.name != null){
	    		 $("#app-name").html(aplicacion.name);
	    	 }
	    	 if(aplicacion.idEntidad == null){
	    		 $("#btn-buscar").hide();
	    	 }else{
	    		 idEntidad = aplicacion.idEntidad;
	    	 }
	    	 if (urlGB != ""){
	    	 	$("#btn-gb").show();
	    	 }
	    	 mapajs = M.map({
				controls:["location"],
				container:"map",
				wmcfile: searchParam(aplicacion.wmcURL,'wmcfile')
			 });

	    	 //$.mobile.changePage("#inicio");
			   navigator.splashscreen.hide();
	     },
	     error: function(){
         navigator.notification.alert("Se ha producido un error al obtener la aplicación con el id: "
                                        + idAplicacion, errorExit, "Error", "Salir")
	 	 }
	 });
}

function errorExit(){
  navigator.app.exitApp();
}

function searchParam(stringURL, param){
	paramValue ="";
	$.each(stringURL.split('&'), function( index, value ){
	    pos = value.indexOf(param);
	 	if (pos >= 0){
	 		paramValue = value.substr(pos+param.length+1,value.length);
	 		return false;
	  	}
  	});
	return paramValue;
}

function inicio(){
	//console.log("inicio");
	pilaCategorias = [];
	coor_x = null;
	coor_y = null;
	idEntidad = aplicacion.idEntidad;
	datos.offset = 0;
	$("#listaDatos").empty();
	clearSuggest();
	$.mobile.changePage("#inicio");
	capaKML!=null && mapajs.removeLayers(capaKML);
	//capaJSON!=null && mapajs.removeLayers(capaJSON); //no funciona
	capaJSON!=null && capaJSON.getImpl().destroy();
	capaJSON = null; capaKML= null;
}

function atras(actualPage){
	if(pilaCategorias.length==0){
		if (actualPage!="busqueda" && $("#txtBusqueda").val().length>0){
			$.mobile.changePage("#busqueda");
		}else{
			inicio();
		}
	}else{
		pilaCategorias.pop();
		var categoria = pilaCategorias.pop();
		cargarCategoria(categoria);
	}
}
function atrasMapa(actualPage){ //JGL - cambiado (hay 2 puntos de entrada a mapa)
	if ($("#listaDatos li").length>0){
		$.mobile.changePage("#datos");
	}else if ($("#listSuggest li").length>0){
		$.mobile.changePage("#busqueda");
	}else{
		inicio();
	}
	capaKML!=null && mapajs.removeLayers(capaKML);
	//capaJSON!=null && mapajs.removeLayers(capaJSON); //no funciona
	capaJSON!=null && capaJSON.getImpl().destroy();
	capaJSON = null;capaKML= null;
}


//JGL ==================================== Integración de GB y modificaciones ===============================================
$(document).on("pageinit", "#busqueda", function() {
	    $("#txtBusqueda").on("keyup", function () {
	        var $ul = $("#listSuggest"),
	            $input = $(this),
	            value = $input.val(),
	            html = "";
	        $ul.html( "" );
	        if ( value && value.length > 2 ) {
	            $.ajax({
	                url: urlGB + "/suggest",
			        dataType: "jsonp",
			        jsonp: 'json.wrf',
			        data: {
			            'spellcheck.q': $input.val(),
			            wt: 'json',
			        },
	            })
	            .then(function (response) {
	            	//console.log(response);
	            	if(response.spellcheck.suggestions.length>0){
		                $.each(response.spellcheck.suggestions[1].suggestion, function ( i, val ) {
		                    html += "<li><a href='javascript:buscarGeobusquedas(\""+val+"\",directResultGB)'>"+val+"</a></li>";
		                });
		                $ul.html(html);
		                $ul.listview("refresh");
		                $ul.trigger("updatelayout");
	            	}else{
				$ul.empty();
			}
	            });
	        }
	    });
});

function buscarGeobusquedas(query, callback){
	$("#titleDatos").html(query);

	loading(true);
	$.ajax({
        url: urlGB + "/search_mobi",
        dataType: "jsonp",
        jsonp: 'json.wrf',
        data: {
            q: query,
            wt: 'json',
            rows: gbRows
        },
    	success: callback,
	    error: function(){
	 		 alert("Se ha producido un error al realizar la búsqueda");
	 	},
	 	final: function(){loading(false)}
    });
}

function listarResultadosGB(result){
	$("#titleDatos").append(" ("+result.response.numFound+")");
	datosList = result.response.docs;
	if (datosList!=null){
		var htmlElements = [];
		for(i=0;i<datosList.length;i++){
			 var liHtml = "<li><a href='javascript:verDatoGB(" + JSON.stringify(datosList[i]) + ")'>";
			 if($.inArray("equipamiento",datosList[i].keywords)>-1){
				liHtml += datosList[i].equipamiento;
			 }else{
			 	liHtml += datosList[i].organismo + " (" + datosList[i].municipio +")";
			 }

			 liHtml += "</a></li>";
			 htmlElements.push(liHtml);
		 }

		 $.mobile.changePage("#datos");
		 $("#listaDatos").html(htmlElements).listview("refresh");

	}
}

function directResultGB(result){
	datosList = result.response.docs;
	if (datosList!=null && datosList.length>0){
		$("#listaDatos").empty();
		verDatoGB(datosList[0]);

	}
}

function clearSuggest(){
	$('#listSuggest').empty();
	$('#txtBusqueda').val('');
}

function verDatoGB(dato){

	f =  new ol.format.WKT().readFeature(dato.geom);
	delete dato.geom;
	f.setId(dato.solrid);
	delete dato.solrid;
	f.setProperties(dato);
	bbox = f.getGeometry().getExtent();
	point = ol.extent.getCenter(bbox); //vale para todo tipo de geometrías

	capaJSON = new M.layer.GeoJSON({
    	name: "Información",
    	source: new ol.format.GeoJSON().writeFeatureObject(f)},
    	{hide: attrNotShow});

	mapajs.addLayers(capaJSON);

	capaJSON.getImpl().getOL3Layer().setStyle(new ol.style.Style({
	  image: new ol.style.Icon({
	     src: 'lib/mapea/assets/img/m-pin-24-sel.svg'
	  }),
	  text: new ol.style.Text({
	          text: f.get('organismo'),
	          font: 'bold 13px Helvetica, sans-serif',
	          offsetY: -20,
	          scale: 1,
	          fill: new ol.style.Fill({
	          	color: 'white'
	          }),
	          stroke: new ol.style.Stroke({
	            color: 'black',
	            width: 1.2
	          })
	    })
	}));
	capaJSON.getImpl().selectFeatures([f],ol.extent.getCenter(f.getGeometry().getExtent()));


	mapajs.setBbox(bbox);
  	/*mapajs.setCenter({
		  'x': point[0],
		  'y': point[1],
		  'draw': false}).setZoom(15);  */
  	$.mobile.changePage("#mapa");
}

var sort_by = function(field, reverse, primer){

   var key = primer ?
       function(x) {return primer(x[field])} :
       function(x) {return x[field]};

   reverse = !reverse ? 1 : -1;

   return function (a, b) {
       return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
     }
}
