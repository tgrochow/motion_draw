const REQUEST_GET_ID           = 0;
const REQUEST_GET_CLIENT_LIST  = 1;
const REQUEST_ADD_MOTION       = 2;

function Motion(m_vector,m_color,m_visible)
{
  this.vector  = m_vector;
  this.color   = m_color;
  this.visible = m_visible;
}

function Client(client_id)
{
  this.id           = client_id;

  this.motion_array = [];
}

Client.prototype.add_motion = function(motion)
{
  this.motion_array.push(motion);
};

function Server()
{
  this.fs_module               = require('fs');
  this.https_module            = require('https');
  this.express_module          = require('express');
  this.websocket_server_module = require('websocket').server;

  this.application             = this.express_module();
  this.web_server              = null;
  this.websocket_server        = null;

  this.port                    = '';
  this.protocol                = '';
  this.content_path            = '';

  this.client_list             = [];
}

Server.prototype.client_index = function(client_id)
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

Server.prototype.add_client = function(client_id)
{
  var client_index = this.client_index(client_id);

  if(client_index === -1)
  {
    this.client_list.push(new Client(client_id));

    client_index = (this.client_list.length - 1);
  }

  return client_index;
};

Server.prototype.init_web_server = function(ws_port,ws_protocol,content_path)
{
  this.port         = ws_port;
  this.protocol     = ws_protocol;
  this.content_path = content_path;

  var options =
  {
    key  : this.fs_module.readFileSync('certificate/server.key'),
    cert : this.fs_module.readFileSync('certificate/server.crt')
  };

  this.application.use(this.express_module.static(content_path));

  this.application.get('/',function(req,res)
  {
    res.sendFile(path.join(__dirname + '/index.html'));
  });

  this.web_server = this.https_module.createServer(options,this.application);

  this.init_websocket_server();

  this.web_server.listen(this.port);
};

Server.prototype.init_websocket_server = function()
{
  this.websocket_server = new this.websocket_server_module(
  {
    httpServer: this.web_server,
    autoAcceptConnections: false
  });

  this.websocket_server.on('request',process_request);
};

function process_request(request)
{
  var connection       = request.accept(server.protocol,request.origin);

  console.log(request.origin);

  connection.client_id = request.httpRequest.headers['sec-websocket-key'];

  connection.on('message',process_message);
}

function process_message(message)
{
  if(message.type !== 'utf8')
  {
    console.log('client request: unsupported message type ' + message.type);

    return;
  }

  var client_request = JSON.parse(message.utf8Data);

  if(client_request === null)
  {
    console.log('client request: no parsable JSON object');

    return;
  }

  client_request.client_id = this.client_id;


  try
  {
    switch(client_request.request_type)
    {
      case REQUEST_GET_ID:

        this.sendUTF(JSON.stringify(client_request));
        break;

      case REQUEST_GET_CLIENT_LIST:

        var request = {'request_type': REQUEST_GET_CLIENT_LIST,
                       'client_list':  server.client_list      };

        this.sendUTF(JSON.stringify(request));
        break;

      case REQUEST_ADD_MOTION:

        var c_index = server.add_client(this.client_id);

        var motion = new Motion(client_request.motion.vector,
                                client_request.motion.color,
                                client_request.motion.visible);

        server.client_list[c_index].add_motion(motion);

        server.broadcast_request(client_request);
        break;

      default:

        console.log('client request: unknown request type');
        break;
    }
  }

  catch(exception)
  {
    console.log('exception: ' + exception.message);
  }
}

Server.prototype.broadcast_request = function(request)
{
  var connection = null;

  for(var c_index = 0;
          c_index <  this.websocket_server.connections.length; ++c_index)
  {
    connection = this.websocket_server.connections[c_index];

    //if(connection.client_id !== request.client_id)
    //{
      connection.sendUTF(JSON.stringify(request));
    //}
  }
};

var server = new Server();

server.init_web_server('9080','motion_draw','content');
