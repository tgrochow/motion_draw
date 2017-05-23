const REQUEST_GET_ID           = 0;
const REQUEST_GET_CLIENT_LIST  = 1;
const REQUEST_ADD_MOTION       = 2;

window.onload = function()
{
  canvas.init('viewer_canvas');
  canvas.resize(window.innerWidth,window.innerHeight);
  canvas.scale(6.0);

  canvas.dom_canvas.addEventListener("touchstart",touchdown);
  canvas.dom_canvas.addEventListener("touchmove",touchmove);
  canvas.dom_canvas.addEventListener("touchend",touchend);

  viewer.init_user_interface();
  viewer.init_websocket(host,'9080','motion_draw');
  viewer.init_navigator();
};

window.onresize = function()
{
  canvas.resize(window.innerWidth,window.innerHeight);
};

function Motion(m_vector,m_color,m_visible)
{
  this.vector  = m_vector;
  this.color   = m_color;
  this.visible = m_visible;
}

function Client(client_id)
{
  this.id            = client_id;
  this.motion_array  = [];
  this.line_indices  = [];
  this.marker_index  = -1;
  this.pos           = new Float32Array([0.0,0.0,0.0]);
}

Client.prototype.add_motion = function(m_vector,m_color,m_visible)
{
  var motion  = new Motion(m_vector,m_color,m_visible);

  var depth   = 0.0;
  var dir     = new Float32Array([m_vector[0],m_vector[1],depth]);
  var new_pos = vec3.add(this.pos,dir);

  if(m_visible == true)
  {
    var color = new Uint8Array(m_color);

    if(this.motion_array.length != 0)
    {
      var prev_motion_index = this.motion_array.length - 1;
      var prev_motion       = this.motion_array[prev_motion_index];

      if(prev_motion.visible == true)
      {
        var line_index = this.line_indices[this.line_indices.length - 1];
        var prev_color = new Uint8Array(prev_motion.color);
        canvas.set_line_color(line_index,prev_color,color);
      }
    }

    this.line_indices.push(canvas.load_line(this.pos,new_pos,color,color));
  }

  this.pos = new_pos;

  this.motion_array.push(motion);
};

Client.prototype.load_position_marker = function()
{
  if(this.marker_index != -1)
  {
    canvas.remove_arrow_glyph(this.marker_index);

    this.marker_index = -1;
  }

  if(this.motion_array.length != 0)
  {
    var motion_index = this.motion_array.length - 1;
    var motion       = this.motion_array[motion_index];
    var dir          = new Float32Array(motion.vector);
    var color        = new Uint8Array([255,255,255]);

    this.marker_index = canvas.load_arrow_glyph(this.pos,dir,color);
  }
};

var viewer = new function()
{
  this.client_id   = null;
  this.client_list = [];
  this.ui          = {};
  this.state       = {};

  this.init_websocket = function(host,port,protocol)
  {
    this.host     = host;
    this.port     = port;
    this.protocol = protocol;

    var address    = this.host + ':' + this.port;
    this.websocket = new WebSocket(address,protocol);

    this.websocket.onopen    = websocket_onopen;
    this.websocket.onerror   = websocket_onerror;
    this.websocket.onmessage = websocket_onmessage;
  };

  this.init_navigator = function()
  {
    if(!navigator.geolocation)
    {
      console.log('viewer: navigator not found');
      return;
    }

    this.state.nav_pos = null;

    var options =
    {
      enableHighAccuracy: true,
      timeout:            5000,
      maximumAge:         6000
    };

    navigator.geolocation.watchPosition(nav_watch_pos,nav_error,options);
  };

  this.init_user_interface = function()
  {
    this.ui.toggle_draw = document.getElementById("toggle_drawing");
    this.ui.toggle_menu = document.getElementById('c_toggle_menu');
    this.ui.menu        = document.getElementById('c_menu');
    this.ui.x           = document.getElementById('c_x');
    this.ui.y           = document.getElementById('c_y');
    this.ui.acc         = document.getElementById('c_acc');
    this.ui.color       = document.getElementById('c_color');

    this.ui.menu.style.display = "none";
    this.state.line_visible    = true;

    this.ui.toggle_menu.onclick = function toggle_menu()
    {
      // if is menuBox displayed, hide it
      if(this.ui.menu.style.display == "block")
      {
        this.ui.menu.style.display = "none";
      }

      // if is menuBox hidden, display it
      else
      {
        this.ui.menu.style.display  = "block";
      }
    };

    // this button decides if the motion vector will be drawn
    this.ui.toggle_draw.onclick = function()
    {
      if(motion_draw_viewer.line_visible)
      {
        this.state.line_visible = false;
        this.ui.toggle_draw     = "start drawing";
      }
      else
      {
        this.state.line_visible = true;
        this.ui.toggle_draw     = "stop drawing";
      }
    };
  };

  this.client_index = function(client_id)
  {
    var c_index;

    for(c_index = 0 ; c_index < this.client_list.length ; ++c_index)
    {
      if(this.client_list[c_index].id === client_id)
      {
        return c_index;
      }
    }

    return -1;
  };

  this.add_client = function(client_id)
  {
    var client_index = this.client_index(client_id);

    if(client_index === -1)
    {
      this.client_list.push(new Client(client_id));

      client_index = (this.client_list.length - 1);
    }

    return client_index;
  };

  this.concat_client_list = function(c_list)
  {
    var client       = null;
    var motion       = null;
    var client_index = -1;

    for(var c_index = 0 ; c_index < c_list.length ; ++c_index)
    {
      client       = c_list[c_index];
      client_index = this.add_client(client.id);

      for(var m_index = 0 ; m_index < client.motion_array.length ; ++m_index)
      {
        motion = c_list[c_index].motion_array[m_index];

        this.client_list[client_index].add_motion(motion.vector,
                                                  motion.color,
                                                  motion.visible);
      }
    }
  }

  this.correct_marker_indices = function(client_id)
  {
    for(var c_index = this.client_index(client_id) + 1 ;
            c_index < this.client_list.length          ; ++c_index)
    {
      client = this.client_list[c_index];

      client.marker_index -= 1;
    }
  }

  this.send_motion = function(pos)
  {
    var min_acc     = 10.0;
    var vec_dec_plc = 4;
    var vec_scale   = 100000;

    if(pos.coords.accuracy > min_acc) return;

    if(this.state.nav_pos == null)
    {
      viewer.state.nav_pos = pos.coords;
      return;
    }

    var diff_lat  = pos.coords.latitude  - this.state.nav_pos.latitude;
    var diff_lng  = pos.coords.longitude - this.state.nav_pos.longitude;
    diff_lat     *= vec_scale;
    diff_lng     *= vec_scale;
    diff_lat      = round_dec(diff_lat,vec_dec_plc);
    diff_lng      = round_dec(diff_lng,vec_dec_plc);

    this.ui.x.value   = diff_lng;
    this.ui.y.value   = diff_lat;
    this.ui.acc.value = pos.coords.accuracy;

    var distance  = Math.sqrt(Math.pow(diff_lng,2) + Math.pow(diff_lat,2));

    if(distance < pos.coords.accuracy) return;

    this.state.nav_pos = pos.coords;

    var m_vector  = [diff_lng,diff_lat,0.0];
    var m_color   = this.hex_to_rgb(this.ui.color.value);
    var m_visible = this.state.line_visible;
    var motion    = new Motion(m_vector,m_color,m_visible);
    var request   = {'request_type':REQUEST_ADD_MOTION,'motion':motion};

    this.websocket.send(JSON.stringify(request));
  };
}


function websocket_onopen()
{
  console.log('Websocket: connection established');

  var request = {'request_type' : REQUEST_GET_CLIENT_LIST};

  viewer.websocket.send(JSON.stringify(request));
}

function websocket_onerror(error)
{
  console.log('WebSocket Error: ' + error);
}

function websocket_onmessage(message)
{
  var request = JSON.parse(message.data);

  if(request === null)
  {
    console.log('websocket: no parsable JSON object');

    return;
  }

  try
  {
    switch(request.request_type)
    {
      case REQUEST_GET_ID:

        console.log('websocket: client_id = ' + request.client_id);
        viewer.client_id = request.client_id;
        break;

      case REQUEST_GET_CLIENT_LIST:

        viewer.concat_client_list(request.client_list);
        canvas.draw();
        break;

      case REQUEST_ADD_MOTION:

        var c_index = viewer.add_client(request.client_id);
        var client  = viewer.client_list[c_index];
        var motion  = request.motion;

        client.add_motion(motion.vector,motion.color,motion.visible);

        if(request.client_id == viewer.client_id)
        {
          client.load_position_marker();
        }
        //viewer.correct_marker_indices(request.client_id);

        canvas.draw();
        break;

      default:

        console.log('websocket: unknown request type');
        break;
    }
  }

  catch(exception)
  {
    console.log('exception: ' + exception.message);
  }
}

function nav_watch_pos(pos)
{
  viewer.send_motion(pos);
}

function nav_error(err)
{
  switch(err.code)
  {
    case err.PERMISSION_DENIED:    break;
    case err.POSITION_UNAVAILABLE: break;
    case err.TIMEOUT:              break;
    case err.UNKNOWN_ERROR:        break;
  }
}

function touchdown(event)
{
  console.log('touchdown: ' + event.touches.length);

  // check number of touches
  if(event.touches.length == 2)
  {
    console.log('touchdown2');

    // Remember startposiotion of the second touch
    viewer.state.prev_second_touch_pos =
    [event.touches[1].clientX,event.touches[1].clientY];
  }

  else if(event.touches.length == 1)
  {
    // Remember startposiotion of the first touch
    viewer.state.prev_touch_pos =
    [event.touches[0].clientX,event.touches[0].clientY];
  }

  else
  {
    // prevents unexpected behavior by stopping other functions
    viewer.state.to_many_touches = true;
  }

  console.log(JSON.stringify(viewer.state.prev_touch_pos));
}

// callback for touchmove
// this function is responsible for navigation and zooming
function touchmove(event)
{
  // if there is only 1 touch the touchpossition is used for navigation only
  if(event.touches.length == 1 && !viewer.state.to_many_touches)
  {
    // calculate the x and y factor by using the difference between touch
    // possitions and adjusting for the zoom factor
    var x = (event.touches[0].clientX - viewer.state.prev_touch_pos[0])
          * canvas.view_attr.scale;

    var y = (viewer.state.prev_touch_pos[1] - event.touches[0].clientY)
          * canvas.view_attr.scale;

    // translate the viewfield
    canvas.translatex(x,y,0.0);

    // remember the new touchpossitions
    viewer.state.prev_touch_pos = [event.touches[0].clientX,
                                   event.touches[0].clientY];
  }

  // if there are 2 touches the zoom and navigation modus will be used
  else if(event.touches.length == 2 && !viewer.state.to_many_touches)
  {
    // ------------ Zooming ------------
    // calculate the distace between the old touchpoints
    var old_distance_vector =
    [viewer.state.prev_touch_pos[0] - viewer.state.prev_second_touch_pos[0],
     viewer.state.prev_touch_pos[1] - viewer.state.prev_second_touch_pos[1]];

    var old_distance = Math.sqrt(Math.pow(old_distance_vector[0],2)
                     + Math.pow(old_distance_vector[1],2));

    // calculate the distace between the new touchpoints
    var new_distance_vector =
    [event.touches[0].clientX - event.touches[1].clientX,
     event.touches[0].clientY - event.touches[1].clientY];

    var new_distance = Math.sqrt(Math.pow(new_distance_vector[0],2)
                     + Math.pow(new_distance_vector[1],2));

    // calculate the zoomfactor from the difference between the old and the
    // new distance
    var scale = canvas.view_attr.scale * (old_distance / new_distance);

    canvas.set_scale(scale);


    // ------------ Navigation ------------
    // calculate the centerpoints between the fingers
    var old_center =
    [(old_distance_vector[0] / 2) + viewer.state.prev_touch_pos[0],
     (old_distance_vector[1] / 2) + viewer.state.prev_touch_pos[1]];

    var new_center =
    [(new_distance_vector[0] / 2) + event.touches[0].clientX,
     (new_distance_vector[1] / 2) + event.touches[0].clientY];

    // calculate the x and y factor by using the difference between touch
    // possitions and adjusting for the zoom factor
    var x = (new_center[0] - old_center[0]) * canvas.view_attr.scale;
    var y = (old_center[1] - new_center[1]) * canvas.view_attr.scale;

    // translate the viewfield
    canvas.translate(x,y,0.0);

    // remember new touch positions
    viewer.state.prev_touch_pos = [event.touches[0].clientX,
                                   event.touches[0].clientY];

    viewer.state.prev_second_touch_pos = [event.touches[1].clientX,
                                          event.touches[1].clientY];
  }
}

// callback for touchend
function canvas_touchend(event)
{
  console.log('touchend');

  // remember the position of the last touch as the position of the first touch
  if(event.touches.length == 1)
  {
    viewer.state.prev_touch_pos = [event.touches[0].clientX,
                                   event.touches[0].clientY];
  }

  else if(event.touches.length == 0)
  {
    // reset stop flag
    viewer_state.to_many_touches = false;
  }
}


function hex_to_rgb(hex_color_string)
{
  var rgb             = [];
  var componen_string = '';
  var componen_index  = 0;

  for(var component = 0 ; component < 3 ; ++component)
  {
    componen_index = 2 * component;

    component_string =
    hex_color_string.slice(componen_index + 1,componen_index + 3);

    rgb.push(parseInt(component_string,16));
  }

  return rgb;
};

function round_dec(dec_number,dec_place)
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
