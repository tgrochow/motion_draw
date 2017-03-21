const REQUEST_GET_ID           = 0;
const REQUEST_GET_CLIENT_LIST  = 1;
const REQUEST_ADD_MOTION       = 2;

var motion_draw_viewer = null;

window.onload = function()
{
  motion_draw_viewer = new Viewer();

  motion_draw_viewer.init_websocket(host,'8080','motion_draw');
  motion_draw_viewer.init_gl_ctx('viewer_canvas');
  motion_draw_viewer.load_gl_program('viewer_vertex','viewer_fragment');
  motion_draw_viewer.prepare_gl_buffer();
  motion_draw_viewer.begin_drawing(500);
  motion_draw_viewer.init_navigator();

  motion_draw_viewer.control.x     = document.getElementById('c_x');
  motion_draw_viewer.control.y     = document.getElementById('c_y');
  motion_draw_viewer.control.acc   = document.getElementById('c_acc');
};

function Vec3(v_x,v_y,v_z)
{
  this.x = v_x;
  this.y = v_y;
  this.z = v_z;
}

Vec3.prototype.add = function(vec3)
{
  this.x += vec3.x;
  this.y += vec3.y;
  this.z += vec3.z;
}

Vec3.prototype.sub = function(vec3)
{
  this.x += vec3.x;
  this.y += vec3.y;
  this.z += vec3.z;
}

Vec3.prototype.dot = function(vec3)
{
  return this.x * vec3.x + this.y * vec3.y + this.z * vec3.z;
}

Vec3.prototype.get_array = function()
{
  return [this.x,this.y,this.z];
}

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
  this.current_index = -1;
  this.current_pos   = -1;
}

Client.prototype.add_motion = function(m_vector,m_color,m_visible)
{
  var motion = new Motion(m_vector,m_color,m_visible);

  this.motion_array.push(motion);
};

Client.prototype.generate_polyline_list = function(origin)
{
  var polyline_list  = [];
  var prev_pos       = new Vec3(origin.x,origin.y,origin.z);
  var pos            = new Vec3(origin.x,origin.y,origin.z);

  for(var m_index = 0 ; m_index < this.motion_array.length ; ++m_index)
  {
    pos.add(this.motion_array[m_index].vector);

    if(this.motion_array[m_index].visible)
    {
      polyline_list = polyline_list.concat(prev_pos.get_array());
      polyline_list = polyline_list.concat(pos.get_array());
    }

    prev_pos.add(this.motion_array[m_index].vector);
  }

  return polyline_list;
};

function Viewer()
{
  this.websocket     = null;
  this.host          = '';
  this.port          = '';
  this.protocol      = '';

  this.client_list   = [];

  this.canvas        = null;
  this.gl_ctx        = null;
  this.gl_program    = null;
  this.gl_buffer     = null;

  this.draw_interval = null;

  this.prev_pos      = null;
  this.vec_dec_plc   = 4;
  this.vec_scale     = 100000;

  this.control       = {'x' : null, 'y' : null,'acc' : null};
}

Viewer.prototype.init_websocket = function(host,port,protocol)
{
  this.host      = host;
  this.port      = port;
  this.protocol  = protocol;

  var address    = this.host + ':' + this.port;
  this.websocket = new WebSocket(address,protocol);

  this.websocket.onopen    = websocket_onopen;
  this.websocket.onerror   = websocket_onerror;
  this.websocket.onmessage = websocket_onmessage;
};

Viewer.prototype.init_navigator = function()
{
  if(!navigator.geolocation)
  {
    return;
  }

  var options =
  {
    enableHighAccuracy: true,
    timeout:            5000,
    maximumAge:         0
  };

  navigator.geolocation.watchPosition(nav_watch_pos,nav_error,options);
};

Viewer.prototype.client_index = function(client_id)
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

Viewer.prototype.add_client = function(client_id)
{
  var client_index = this.client_index(client_id);

  if(client_index === -1)
  {
    this.client_list.push(new Client(client_id));

    client_index = (this.client_list.length - 1);
  }

  return client_index;
};

Viewer.prototype.concat_client_list = function(c_list)
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

Viewer.prototype.init_gl_ctx = function(canvas_id)
{
  this.canvas = document.getElementById(canvas_id);

  try
  {
     this.gl_ctx = this.canvas.getContext('experimental-webgl');
  }

  catch(exception)
  {
     console.log('webGL: ' + exception.message);
  }

  if(!this.gl_ctx)
  {
     console.log('webGL: context initialization failed');
  }
};

Viewer.prototype.load_gl_shader = function(shader_id)
{
  var shader_script = document.getElementById(shader_id);

  if(!shader_script)
  {
    console.log('webGL: shaderID ' +  shader_id + 'was not found');

    return null;
  }

  var gl_shader   = null;
  var shader_type = null;

  if(shader_script.type == 'x-shader/x-vertex')
  {
    shader_type = this.gl_ctx.VERTEX_SHADER;
  }

  else if(shader_script.type == 'x-shader/x-fragment')
  {
    shader_type  = this.gl_ctx.FRAGMENT_SHADER;
  }

  else
  {
    console.log('webGL: unknown shader type');

    return null;
  }

  gl_shader = this.gl_ctx.createShader(shader_type);

  this.gl_ctx.shaderSource(gl_shader,shader_script.text);
  this.gl_ctx.compileShader(gl_shader);

  if(!this.gl_ctx.getShaderParameter(gl_shader,this.gl_ctx.COMPILE_STATUS))
  {
     console.log('webGL: ' + this.gl_ctx.getShaderInfoLog(gl_shader));

     return null;
  }


  return gl_shader;
};

Viewer.prototype.load_gl_program = function(vs_id,fs_id)
{
  var vertex_shader   = this.load_gl_shader(vs_id);
  var fragment_shader = this.load_gl_shader(fs_id);

  this.gl_program = this.gl_ctx.createProgram();

  this.gl_ctx.attachShader(this.gl_program,vertex_shader);
  this.gl_ctx.attachShader(this.gl_program,fragment_shader);
  this.gl_ctx.linkProgram(this.gl_program);


  if(!this.gl_ctx.getProgramParameter(this.gl_program,this.gl_ctx.LINK_STATUS))
  {
     console.log("webGL: program linking failed");
  }

  else
  {
    this.gl_ctx.useProgram(this.gl_program);
  }
};

Viewer.prototype.prepare_gl_buffer = function()
{
  this.gl_buffer = this.gl_ctx.createBuffer();

  var attrib_loc = this.gl_ctx.getAttribLocation(this.gl_program,'pos');

  if(attrib_loc === -1)
  {
    console.log('webGL: vertex attribute not found');

    return;
  }

  this.gl_ctx.bindBuffer(this.gl_ctx.ARRAY_BUFFER,this.gl_buffer);
  this.gl_ctx.enableVertexAttribArray(attrib_loc);
  this.gl_ctx.vertexAttribPointer(attrib_loc,3,this.gl_ctx.FLOAT,false,0,0);
};

Viewer.prototype.begin_drawing = function(update_interval)
{
  this.draw_interval = setInterval(draw_motion_viewer,update_interval);
}

Viewer.prototype.draw = function()
{
  var client_line_list = null;
  var polyline_list    = [];

  var origin = new Vec3(0.0,0.0,0.0);

  for(var c_index = 0 ; c_index < this.client_list.length ; ++c_index)
  {
    client_line_list = this.client_list[c_index].generate_polyline_list(origin);

    polyline_list    = polyline_list.concat(client_line_list);
  }

  if(polyline_list.length < 6) return;

  buffer_data = new Float32Array(polyline_list);

  this.gl_ctx.bufferData(this.gl_ctx.ARRAY_BUFFER,
                         buffer_data,
                         this.gl_ctx.DYNAMIC_DRAW  );

  var p_mat = mat4.perspective_matrix(45,1,0.1,500.0);
  var v_mat = mat4.translation_matrix(0.0,0.0,-200.0);
  var pv    = mat4.mat_mult(p_mat,v_mat);

  var location = this.gl_ctx.getUniformLocation(this.gl_program,'pv');

  this.gl_ctx.uniformMatrix4fv(location,false,mat4.transpose(pv));

  this.gl_ctx.clearColor(0.0,0.0,0.0,1.0);

  this.gl_ctx.clear(this.gl_ctx.COLOR_BUFFER_BIT);

  this.gl_ctx.drawArrays(this.gl_ctx.LINES,0,polyline_list.length / 3);
}

Viewer.prototype.round_dec = function(dec_number,dec_place)
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

Viewer.prototype.send_pos = function(pos)
{
  this.control.acc.value = pos.coords.accuracy;

  if(pos.coords.accuracy > 10)
  {
    return;
  }

  if(this.prev_pos === null)
  {
    this.prev_pos = pos;
    return;
  }

  var diff_lat  = pos.coords.latitude  - this.prev_pos.coords.latitude;
  var diff_lng  = pos.coords.longitude - this.prev_pos.coords.longitude;

  diff_lat     *= this.vec_scale;
  diff_lng     *= this.vec_scale;
  diff_lat      = this.round_dec(diff_lat,this.vec_dec_plc);
  diff_lng      = this.round_dec(diff_lng,this.vec_dec_plc);

  if(Math.sqrt(Math.pow(diff_lng,2) + Math.pow(diff_lat,2)) < pos.coords.accuracy)
  {
    return;
  }

  this.control.x.value = diff_lng;
  this.control.y.value = diff_lat;

  this.websocket.send(JSON.stringify({'request_type':REQUEST_ADD_MOTION,'motion':{'vector':{'x':diff_lng,'y':diff_lat,'z':0},'color':{'r':0,'g':0,'b':0},'visible':true}}));

  this.prev_pos = pos;
};

function websocket_onopen()
{
  console.log('Websocket: connection established');

  var request = {'request_type' : REQUEST_GET_CLIENT_LIST};

  motion_draw_viewer.websocket.send(JSON.stringify(request));
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
        break;

      case REQUEST_GET_CLIENT_LIST:

        motion_draw_viewer.concat_client_list(request.client_list);
        break;

      case REQUEST_ADD_MOTION:

        var c_index = motion_draw_viewer.add_client(request.client_id);
        var client  = motion_draw_viewer.client_list[c_index];
        var motion  = request.motion;

        client.add_motion(motion.vector,motion.color,motion.visible);
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

function draw_motion_viewer()
{
  motion_draw_viewer.draw();
}

function nav_watch_pos(pos)
{
  motion_draw_viewer.send_pos(pos);
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
