const REQUEST_GET_ID           = 0;
const REQUEST_GET_CLIENT_LIST  = 1;
const REQUEST_ADD_MOTION       = 2;

window.onload = function()
{
  viewer.init_websocket(host,'9080','motion_draw');
  canvas.init('viewer_canvas');
  canvas.resize(window.innerWidth,window.innerHeight);
  canvas.scale(6.0);
  canvas.enable_interaction();
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
        client.load_position_marker();
        viewer.correct_marker_indices(request.client_id);

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
