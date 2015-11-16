//******** configuración **********************//
url = "http://mapea-sigc.juntadeandalucia.es/sepim_server/api";
urlGB = "http://geobusquedas-sigc.juntadeandalucia.es/geobusquedas/[CORE]"; //JGL - vacío si no tiene GB
idAplicacion = 14; //id de la aplicación
//*********************************************//
aplicacion = null;
pilaCategorias = [];
coor_x = null;
coor_y = null;
idEntidad = null;
datos = {
	limit: -1,
	offset:0
};
showDistance = false; //JGL - indica si mostrar la distancia o no en la búsqueda por categorías


