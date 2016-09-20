var mapajs =null;
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
	navigator.app.exitApp();
}

function obtenerUrlComoObjeto(url){
	var urlObjeto = {};
	separadorUrlParametrosIndex = url.indexOf("?");
	
	urlObjeto.url = url.substr(0, separadorUrlParametrosIndex);
	urlObjeto.parametros = {};
	var parametrosUrl = url.substr(separadorUrlParametrosIndex+1).split("&");
	var i = 0;
	for(i=0;i<parametrosUrl.length;i++){
		var parametro = parametrosUrl[i].split("=");
		if(parametro[0].toLowerCase()=="projection"){
			var projection = parametro[1].split("*");
			if(projection[0].toLowerCase().indexOf("EPSG")){
				urlObjeto.projection = projection[0];
			}else{
				urlObjeto.projection = projection[1];
			}
		}
		urlObjeto.parametros[parametro[0]]= parametro[1];
	}
	ORIGINAL_LAYERS = urlObjeto.parametros.layers;
	
	return urlObjeto;
}

// controladores
function loading(showLoading){
	if(showLoading){
		$.mobile.loading( "show",{});
	}else{
		$.mobile.loading( "hide",{});
	}
}

function geolocalizar(){
	//console.log("geolocalizar");
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

function establecerLocalizacion(){
	var entidad = $("#municipios").val();
	if(entidad==""){
		alert("Ha de seleccionar las provincias y los municipios");
		return;
	}
	idEntidad = entidad;
	coor_x = null;
	coor_y = null;
	cargarCategoria();
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
	    		 	   coor_x!=null? true: 
	    		 					/equipamiento/i.test(value.name));
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


//function getTablaDatos(fields){
//	var html = "";
//	var i=0;
//	var length = fields.length;
//	for(i=0;i<length;i++){
//		html += "<li><b>" + fields[i].field +"</b>: " + fields[i].value + "<li>";
//	}
//	if(html!=""){
//		html = "<ul>" + html + "</ul>";
//	}else{
//		html = "No hay ningún elemento a mostrar";
//	}
//	
//	return html;
//}

//OJO: todo esto necesita tener mapea en el mismo servidor => CROSS DOMAIN
popup = null;
function verDato(idCategoria,dato){
	
  	bbox = ol.proj.transformExtent([dato.minX,dato.minY,dato.maxX,dato.maxY], 
									'EPSG:4326', mapajs.getProjection().code);
  	
    
  	var capaKML = new M.layer.KML(generarCapaKML(idCategoria,dato.pkValue));

  	
  	mapajs.addKML(capaKML);
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
	 		 alert("Se ha producido un error al obtener la aplicación con el id: " + idAplicacion);
	 	 }
	 });
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
//JGL
	$("#listaDatos").empty(); 
	clearSuggest();
//
	$.mobile.changePage("#inicio");
}

function atras(){
	//console.log("atras");
	if(pilaCategorias.length==0){
		if ($("#txtBusqueda").val().length>0){
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
function atrasMapa(){ //JGL - cambiado (hay 2 puntos de entrada a mapa)
	if ($("#listaDatos li").length>0){
		$.mobile.changePage("#datos");
	}else if ($("#listSuggest li").length>0){
		$.mobile.changePage("#busqueda");
	}else{
		inicio();
	}
	mapajs.getKML().length>0? mapajs.removeKML(mapajs.getKML()[0]) :null;
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

	/*
		wkt = new ol.format.WKT();
		geom = wkt.readFeature(dato.geom,{
											featureProjection:"EPSG:25830"
										 }).getGeometry();
		point = null;
		if (geom.getType() != 'Point'){
			point = ol.extent.getCenter(geom.getExtent());
		}else{
			point = geom;
		}
		console.log(point);
		//if(srcMapeaObjeto.projection != "EPSG:25830"){
			//point.transform("EPSG:25830", srcMapeaObjeto.projection);
			//console.log(point);
		//}		
		
	*/
	
	f =  new ol.format.WKT().readFeature(dato.geom);
	f.setId(dato.solrid);
	coord = f.getGeometry().getCoordinates()[0]; //sé que es punto;
	 //JGL - no establezco todas las propiedades para eliminar los campos no deseados
    //f.setProperties(dato);																
	f.properties ={};
	htmlTable = "<div class='result'>";
	$.each(dato, function(k, v) {
		if ($.inArray(k,attrNotShow)==-1){
				f.properties[k] = v;
				htmlTable += "<table><tbody><tr><td class='key'>";
		        htmlTable += k;
		        htmlTable += "</td><td class='value'>";
		        htmlTable += v;
		        htmlTable += "</td></tr></tbody></table>";
		}

	});
	htmlTable += "</div>";

  	mapajs.setCenter({
		  'x': coord[0],
		  'y': coord[1],
		  'draw': true  
		}).setZoom(10).addLabel(htmlTable);
  	$(".m-popup").removeClass("m-default").addClass("m-full");
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