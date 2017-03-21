const REQUEST_GET_ID           = 0;
const REQUEST_GET_CLIENT_LIST  = 1;
const REQUEST_ADD_MOTION       = 2;

var debug_client = null;

function Debug_motion(m_vector,m_visible)
{
  this.vector   = m_vector;
  this.vector.z = 0.0;
  this.color    = {'r' : 0,'g' : 0,'b' : 0};
  this.visible  = m_visible;
}

function Debug_client()
{
  this.websocket     = null;

  this.host          = '';
  this.port          = '';
  this.protocol      = '';

  this.map           = null;
  this.map_div       = null;
  this.polyline_list = [];

  this.vec_dec_plc   = 4;
  this.vec_scale     = 100000;

  this.control       = {'x' : null, 'y' : null, 'new_line' : null};
}

Debug_client.prototype.init_websocket = function(host,port,protocol)
{
  this.host      = host;
  this.port      = port;
  this.protocol  = protocol;

  var address    = this.host + ':' + this.port;
  this.websocket = new WebSocket(address,protocol);

  this.websocket.onopen = function()
  {
    console.log('Websocket: connection established');
  };

  this.websocket.onerror = function(error)
  {
    console.log('WebSocket Error: ' + error);
  };

  this.websocket.onmessage = function(message)
  {
    console.log('Server: ' + message.data);
  };
};

Debug_client.prototype.send_motion = function(motion)
{
  var request = {'request_type' : REQUEST_ADD_MOTION,'motion' : motion};

  this.websocket.send(JSON.stringify(request));
};

Debug_client.prototype.init_control = function()
{
  this.control.x        = document.getElementById('c_x');
  this.control.y        = document.getElementById('c_y');
  this.control.new_line = document.getElementById('c_new_line');

  this.control.x.value  = 0;
  this.control.y.value  = 0;

  this.control.new_line.onclick = new_polyline;
}

Debug_client.prototype.calc_motion_vector = function(pos,prev_pos)
{
  var diff_lat  = pos.lat() - prev_pos.lat();
  var diff_lng  = pos.lng() - prev_pos.lng();

  diff_lat     *= this.vec_scale;
  diff_lng     *= this.vec_scale;
  diff_lat      = this.round_dec(diff_lat,this.vec_dec_plc);
  diff_lng      = this.round_dec(diff_lng,this.vec_dec_plc);

  return {'x' : diff_lng,'y' : diff_lat};
};

Debug_client.prototype.round_dec = function(dec_number,dec_place)
{
  if(dec_place > 0)
  {
    d = Math.pow(10,dec_place);

    dec_number *= d;
    dec_number  = Math.round(dec_number);
    dec_number /= d;
  }

  return dec_number;
}

function new_polyline()
{
  var polyline_number  = debug_client.polyline_list.length;

  if(polyline_number !== 0)
  {
    var current_polyline = debug_client.polyline_list[polyline_number - 1];
    var path             = current_polyline.getPath();

    if(path.getLength() === 0)
    {
      return;
    }
  }

  var polyline = new google.maps.Polyline(
  {
    strokeColor:   '#000000',
    strokeOpacity: 1.0,
    strokeWeight:  3
  });

  polyline.setMap(debug_client.map);

  debug_client.polyline_list.push(polyline);
}

function init_map()
{
  debug_client = new Debug_client();

  debug_client.init_websocket(host,'8080','motion_draw');
  debug_client.init_control();

  var map_properties =
  {
    center:           new google.maps.LatLng(50.9797831,11.322701300000062),
    zoom:             20,
    disableDefaultUI: true
  };

  debug_client.map_div = document.getElementById('map');
  debug_client.map = new google.maps.Map(debug_client.map_div,map_properties);

  debug_client.map.addListener('click',map_click_handler);

  new_polyline();
}

function map_click_handler(mouse_event)
{
  var polyline_number  = debug_client.polyline_list.length;
  var current_polyline = debug_client.polyline_list[polyline_number - 1];
  var path             = current_polyline.getPath();
  var prev_pos         = null;
  var motion_visible   = true;

  if(path.getLength() === 0)
  {
    motion_visible = false;

    if(debug_client.polyline_list.length < 2)
    {
      prev_pos = debug_client.map.getCenter();
    }

    else
    {
      var prev_polyline = debug_client.polyline_list[polyline_number - 2];
      var prev_path     = prev_polyline.getPath();

      prev_pos          = prev_path.getAt(prev_path.getLength() - 1);
    }
  }

  else
  {
    prev_pos = path.getAt(path.getLength() - 1);
  }

  var m_vec  = debug_client.calc_motion_vector(mouse_event.latLng,prev_pos);
  var motion = new Debug_motion(m_vec,motion_visible);

  debug_client.send_motion(motion);

  debug_client.control.x.value = m_vec.x;
  debug_client.control.y.value = m_vec.y;

  path.push(mouse_event.latLng);
}
