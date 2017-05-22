// canvas class for primitive drawing
var canvas = new function()
{
  this.dom_canvas       = null;
  this.gl_ctx           = null;
  this.gl_program_map   = {};
  this.gl_buffer_map    = {};
  this.gl_uniform_map   = {};
  this.gl_attr_loc      = {};
  this.gl_uniform_loc   = {};
  this.primitive_list   = {'line_array':[],'arrow_glyph_array':[]};
  this.primitive_data   = {'line_f32_attr'   :[],
                           'line_uint8_attr' :[],
                           'line_index_array':[],
                           'arrow_glyph_f32_attr':[],
                           'arrow_glyph_uint8_attr':[]};
  this.view_attr        = {};
  this.event_attr       = {};
  this.initialized      = false;

  // init webGL context
  this.init = function(canvas_id)
  {
    this.dom_canvas = document.getElementById(canvas_id);

    // canvas id was not found
    if(this.dom_canvas === null)
    {
      console.log('canvas: invalid canvas id <' + canvas_id + '>');
      return;
    }

    // wrong node type
    if(this.dom_canvas.nodeName !== 'CANVAS')
    {
      this.dom_canvas = null;

      var message  = 'canvas: ';
          message += 'invalid node name <' + this.dom_canvas.nodeName + '>' ;
          message += '(CANVAS required)';

      console.log(message);
      return;
    }

    // get webGL context
    this.gl_ctx = this.dom_canvas.getContext('experimental-webgl');

    // invalid context request
    if(this.gl_ctx === null)
    {
      console.log('canvas: invalid context request');
      return;
    }

    // initialize all webGL programs
    var program_map_initialized = this.init_gl_program_map();

    // program initialization error
    if(!program_map_initialized)
    {
      return;
    }

    // initialize memory layout
    this.init_gl_memory_layout();

    // initialize view
    this.init_view_attributes();

    // initialize uniforms
    this.init_gl_uniforms();

    this.initialized = true;
  };

  // compile shader, link programs
  this.init_gl_program_map = function()
  {
    // default line rendering program
    var vs_source  = 'attribute vec3 pos;\n';
        vs_source += 'attribute vec3 next_pos;\n';
        vs_source += 'attribute vec3 color;\n';
        vs_source += 'attribute float displacement;\n';
        vs_source += 'uniform mat4 projection_view;\n';
        vs_source += 'uniform float aspect_ratio;\n';
        vs_source += 'varying vec3 frag_color;\n';
        vs_source += 'void main(){\n';
        vs_source += 'frag_color = color;\n';
        vs_source += 'vec4 proj_pos = projection_view * vec4(pos,1.0);\n';
        vs_source += 'vec4 proj_next_pos = '
        vs_source += 'projection_view * vec4(next_pos,1.0);\n';
        vs_source += 'vec2 screen_pos = proj_pos.xy / proj_pos.w;\n';
        vs_source += 'vec2 screen_next_pos = '
        vs_source += 'proj_next_pos.xy / proj_next_pos.w;\n';
        vs_source += 'float device_z = proj_pos.z / proj_pos.w;\n';
        vs_source += 'vec2 line_dir = screen_next_pos - screen_pos;\n';
        vs_source += 'vec2 line_normal = '
        vs_source += 'normalize(vec2(-line_dir.y,line_dir.x));\n';
        vs_source += 'line_normal.x *= aspect_ratio;\n'
        vs_source += 'screen_pos += displacement * line_normal;\n';
        vs_source += 'gl_Position = vec4(screen_pos,device_z,1.0);}';

    var fs_source  = 'precision mediump float;\n';
        fs_source += 'varying vec3 frag_color;\n';
        fs_source += 'void main(){\n';
        fs_source += 'gl_FragColor = vec4(frag_color,1.0);}';

    var gl_program = this.link_program(vs_source,fs_source);

    // compile or linking error
    if(gl_program == null)
    {
      return false;
    }

    this.gl_program_map.line_default = gl_program;

    // default arrow glyph rendering program
    vs_source  = 'attribute vec3 pos;\n';
    vs_source += 'attribute vec2 dir;\n';
    vs_source += 'attribute float displacement;\n';
    vs_source += 'attribute float peak_distance;\n'
    vs_source += 'attribute vec3 color;\n';
    vs_source += 'uniform mat4 projection_view;\n';
    vs_source += 'uniform float aspect_ratio;\n';
    vs_source += 'varying vec3 frag_color;\n';
    vs_source += 'void main(){\n';
    vs_source += 'frag_color = color;\n';
    vs_source += 'vec4 proj_pos = projection_view * vec4(pos,1.0);\n';
    vs_source += 'float device_z = proj_pos.z / proj_pos.w;\n';
    vs_source += 'vec2 screen_pos = proj_pos.xy / proj_pos.w;\n';
    vs_source += 'vec2 n_dir = normalize(dir);\n'
    vs_source += 'vec2 normal = vec2(-n_dir.y,n_dir.x);\n';
    vs_source += 'n_dir.x *= aspect_ratio;\n';
    vs_source += 'normal.x *= aspect_ratio;\n';
    vs_source += 'screen_pos += displacement * normal';
    vs_source += ' - peak_distance * n_dir;\n';
    vs_source += 'gl_Position = vec4(screen_pos,device_z,1.0);}';

    gl_program = this.link_program(vs_source,fs_source);

    // compile or linking error
    if(gl_program == null)
    {
      return false;
    }

    this.gl_program_map.arrow_glyph_default = gl_program;


    // program map initialized
    return true;
  };

  // prepare data buffer, get attribute and uniform locations
  this.init_gl_memory_layout = function()
  {
    // line element buffer, for memory reduction
    this.gl_buffer_map.line_indices = this.gl_ctx.createBuffer();

    // line data buffer for every float32 attribute
    this.gl_buffer_map.line_f32 = this.gl_ctx.createBuffer();

    // line data buffer for everey uint8 attribute
    this.gl_buffer_map.line_uint8 = this.gl_ctx.createBuffer();

    // arrow glyph data buffer for every float32 attribute
    this.gl_buffer_map.arrow_glyph_f32 = this.gl_ctx.createBuffer();

    // arrow glyph data buffer for everey uint8 attribute
    this.gl_buffer_map.arrow_glyph_uint8 = this.gl_ctx.createBuffer();


    // line program
    var program = this.gl_program_map.line_default;

    // get line vertex attribute locations
    this.gl_attr_loc.line_pos =
    this.get_attrib_loc(program,'pos');

    this.gl_attr_loc.line_next_pos =
    this.get_attrib_loc(program,'next_pos');

    this.gl_attr_loc.line_color =
    this.get_attrib_loc(program,'color');

    this.gl_attr_loc.line_displacement =
    this.get_attrib_loc(program,'displacement');

    this.gl_uniform_loc.line_pv =
    this.gl_ctx.getUniformLocation(program,'projection_view');

    this.gl_uniform_loc.line_aspect_ratio =
    this.gl_ctx.getUniformLocation(program,'aspect_ratio');


    // arrow glyph program
    program = this.gl_program_map.arrow_glyph_default;

    // get line vertex attribute locations
    this.gl_attr_loc.arrow_glyph_pos =
    this.get_attrib_loc(program,'pos');

    this.gl_attr_loc.arrow_glyph_dir =
    this.get_attrib_loc(program,'dir');

    this.gl_attr_loc.arrow_glyph_color =
    this.get_attrib_loc(program,'color');

    this.gl_attr_loc.arrow_glyph_displacement =
    this.get_attrib_loc(program,'displacement');

    this.gl_attr_loc.arrow_glyph_peak_distance =
    this.get_attrib_loc(program,'peak_distance');

    this.gl_uniform_loc.arrow_glyph_pv =
    this.gl_ctx.getUniformLocation(program,'projection_view');

    this.gl_uniform_loc.arrow_glyph_aspect_ratio =
    this.gl_ctx.getUniformLocation(program,'aspect_ratio');
  };

  // set reasonable default values for view related attributes
  this.init_view_attributes = function()
  {
    var v = this.view_attr;

    v.field_of_view = 65.0;
    v.aspect_ratio  = this.dom_canvas.height / this.dom_canvas.width;
    v.near          = 1.0;

    var tan_alpha   = Math.tan((Math.PI / 180) * v.field_of_view / 2);

    v.distance      = (this.dom_canvas.width / 2) / tan_alpha;
    v.distance     *= v.aspect_ratio
    v.far           = v.distance * 2;

    v.scale         = 1.0;
    v.translation   = new Float32Array([0.0,0.0,0.0]);
  };

  // set default values for uniform variables
  this.init_gl_uniforms = function()
  {
    var v = this.view_attr;

    this.update_perspective_view();

    this.gl_uniform_map.aspect_ratio = v.aspect_ratio;
  };

  this.enable_interaction = function()
  {
    this.event_attr.mouse_down = false;
    this.event_attr.mouse_pos  = new Float32Array([0.0,0.0]);

    // mouse wheel event source:
    // https://www.sitepoint.com/html5-javascript-mouse-wheel/

    // IE9, Chrome, Safari, Opera
    this.dom_canvas.addEventListener('mousewheel',mouse_wheel_event,false);
    // Firefox
    this.dom_canvas.addEventListener('DOMMouseScroll',mouse_wheel_event,false);

    this.dom_canvas.addEventListener('mousedown',mouse_down_event,false);
    this.dom_canvas.addEventListener('mousemove',mouse_move_event,false);
    this.dom_canvas.addEventListener('mouseup',mouse_up_event,false);
  }

  // recalculate the perspective view matrix after the change of view attributes
  this.update_perspective_view = function()
  {
    // reference with shorter name
    var v = this.view_attr;
    var t = this.view_attr.translation;

    var m_t = mat4.translation_matrix(t[0],t[1],t[2]-v.distance);

    if(v.scale != 1.0)
    {
      var m_s = mat4.scale_matrix(v.scale,v.scale,1.0);

      this.gl_uniform_map.view_matrix = mat4.mat_mult(m_s,m_t);
    }

    else this.gl_uniform_map.view_matrix = m_t;

    this.gl_uniform_map.perspective_matrix =
    mat4.perspective_projection_matrix(v.field_of_view,
                                       v.aspect_ratio,
                                       v.near,v.far);

    this.gl_uniform_map.perspective_view_matrix =
    mat4.mat_mult(this.gl_uniform_map.perspective_matrix,
                  this.gl_uniform_map.view_matrix        );
  };

  // recalculate the aspect ratio after the change of the canvas dimesnions
  this.update_aspect_ratio = function()
  {
    // reference with shorter name
    var v = this.view_attr;

    v.aspect_ratio = this.dom_canvas.height / this.dom_canvas.width;

    this.gl_uniform_map.aspect_ratio = v.aspect_ratio;

    this.gl_ctx.viewport(0,0,this.dom_canvas.width,this.dom_canvas.height);

    this.update_perspective_view();
  };

  this.scale = function(scale_shift)
  {
    this.view_attr.scale += scale_shift;

    this.update_perspective_view();
  };

  this.translate = function(v_t)
  {
    var v_t_current = this.view_attr.translation;

    this.view_attr.translation = vec3.add(v_t_current,v_t);

    this.update_perspective_view();
  };

  // compile shader source
  this.compile_shader = function(shader_source,shader_type)
  {
    // invalid shader type
    if(shader_type !== this.gl_ctx.VERTEX_SHADER &&
       shader_type !== this.gl_ctx.FRAGMENT_SHADER )
    {
      console.log('canvas: invalid shader type <' + shader_type +'>')
      return null;
    }

    // create and compile shader
    var gl_shader = this.gl_ctx.createShader(shader_type);

    this.gl_ctx.shaderSource(gl_shader,shader_source);
    this.gl_ctx.compileShader(gl_shader);

    // shader compile error
    if(!this.gl_ctx.getShaderParameter(gl_shader,this.gl_ctx.COMPILE_STATUS))
    {
      var message  = 'canvas: shader compile error: ';
          message += this.gl_ctx.getShaderInfoLog(gl_shader);

      console.log(message);
      return null;
    }

    return gl_shader;
  };

  // link gl program
  this.link_program = function(vs_source,fs_source)
  {
    if(typeof vs_source != 'string' || typeof fs_source != 'string')
    {
      console.log('canvas: shader source is not a string');
      console.log('canvas: gl program linking failed');

      return null;
    }

    var vs = this.compile_shader(vs_source,this.gl_ctx.VERTEX_SHADER);
    var fs = this.compile_shader(fs_source,this.gl_ctx.FRAGMENT_SHADER);

    // compile error
    if(vs === null || fs === null)
    {
      return null;
    }

    var gl_program = this.gl_ctx.createProgram();

    // attach shader and link program
    this.gl_ctx.attachShader(gl_program,vs);
    this.gl_ctx.attachShader(gl_program,fs);
    this.gl_ctx.linkProgram(gl_program);

    // linking error
    if(!this.gl_ctx.getProgramParameter(gl_program,this.gl_ctx.LINK_STATUS))
    {
       console.log('canvas: program linking error');

       return null;
    }

    return gl_program;
  }

  // get vertex attribute for a given WebGL program
  this.get_attrib_loc = function(gl_program,attribute_name)
  {
    var attrib_loc = this.gl_ctx.getAttribLocation(gl_program,attribute_name);

    // attribute was not found
    if(attrib_loc == -1)
    {
      console.log('canvas: vertex attribute ' + attribute_name + ' not found');
    }

    return attrib_loc;
  };

  // draw all stored lines to the canvas
  this.draw_line_primitives = function()
  {
    this.upload_line_data();

    var pv  = this.gl_uniform_map.perspective_view_matrix;
    var loc = this.gl_uniform_loc.line_pv;

    pv = mat4.transpose(pv);
    this.gl_ctx.uniformMatrix4fv(loc,false,pv);

    loc = this.gl_uniform_loc.line_aspect_ratio;

    this.gl_ctx.uniform1f(loc,this.gl_uniform_map.aspect_ratio);

    this.gl_ctx.clearColor(0.0,0.0,0.0,1.0);

    this.gl_ctx.clear(this.gl_ctx.COLOR_BUFFER_BIT);

    var line_number   = this.primitive_list.line_array.length;
    var vertex_number = line_number * 6;

    this.gl_ctx.drawElements(this.gl_ctx.TRIANGLES,vertex_number,
                             this.gl_ctx.UNSIGNED_SHORT,0);
  }

  // load line and calculate vertex attributes
  this.load_line = function(p1,p2,c1,c2)
  {
    // one or both arguments are not a valid vector
    if(!vec3.valid_vector(p1) || !vec3.valid_vector(p2))
    {
      console.log('canvas: arguments are not valid vectors');
      console.log('canvas: line calculation failed');
      return null;
    }

    // both line points are equal
    if(vec3.equal(p1,p2))
    {
      console.log('canvas: line points are equal');
      console.log('canvas: line calculation failed');
      return null;
    }

    // set line thickness and right displacement direction
    var displacement = 0.005;

    // container for everey vertex attribute with type float32
    // vertex [position(vec3),next_position(vec3),displacement(s)]
    var vertex_f32_attr = [];

    // container for everey vertex attribute with type uint8
    // vertex [color(uint8)]
    var vertex_uint8_attr = [];

    // convert typed array to js array
    p1 = vec3.get_array(p1);
    p2 = vec3.get_array(p2);
    c1 = ivec3.get_array(c1);
    c2 = ivec3.get_array(c2);

    // temporary vertex position
    var v_pos      = null;
    var v_pos_next = null;
    // temporary vertex color
    var v_color    = null;

    // assemble the four different vertices of the line
    for(var vertex_number = 1 ; vertex_number < 5 ; ++vertex_number)
    {
      if(vertex_number < 3)
      {
        v_pos      = p1;
        v_pos_next = p2;
        v_color    = c1;
      }

      else
      {
        v_pos      = p2;
        v_pos_next = p1;
        v_color    = c2;
      }

      vertex_f32_attr = vertex_f32_attr.concat(v_pos);
      vertex_f32_attr = vertex_f32_attr.concat(v_pos_next);
      vertex_f32_attr.push(displacement);

      vertex_uint8_attr = vertex_uint8_attr.concat(v_color);

      displacement *= -1.0;
    }

    // generate vertex index array
    var line_number  = this.primitive_list.line_array.length;
    var index_number = line_number * 4;
    var index_array  = [index_number,index_number + 1,index_number + 2,
                        index_number,index_number + 2,index_number + 3 ];

    // store line data
    var line = {'p1':p1,'p2':p2,'c1':c1,'c2':c2,
                'vertex_f32_attr':vertex_f32_attr,
                'vertex_uint8_attr':vertex_uint8_attr,
                'index_array':index_array};

    this.primitive_list.line_array.push(line);

    // store WebGL primitive data
    this.primitive_data.line_f32_attr =
    this.primitive_data.line_f32_attr.concat(line.vertex_f32_attr);

    this.primitive_data.line_uint8_attr =
    this.primitive_data.line_uint8_attr.concat(line.vertex_uint8_attr);

    this.primitive_data.line_index_array =
    this.primitive_data.line_index_array.concat(line.index_array);

    // upload line data to GPU
    this.upload_line_data();
  };

  // remove one line from primitive array, recollect primitive data
  this.remove_line = function(line_index,c1,c2)
  {
    // invalid line index
    if(typeof line_index != 'number' ||
       line_index <  0                ||
       line_index >= this.primitive_list.line_array.length)
    {
      console.log('canvas: invalid line index');
      console.log('canvas: line removal failed');
      return;
    }

    console.log(this.primitive_list.line_array.length);

    // remove line from primitive list
    this.primitive_list.line_array.splice(line_index,1);

    console.log(this.primitive_list.line_array.length);

    // recollect primitive data from remaining lines
    this.update_line_index_arrays();
    this.collect_line_data();
    this.upload_line_data();
  };

  // load line attributes and indices on GPU, define memory layout
  this.upload_line_data = function()
  {
    var f32_attr_buffer = new Float32Array(this.primitive_data.line_f32_attr);
    var ui8_attr_buffer = new Uint8Array(this.primitive_data.line_uint8_attr);
    var index_buffer    = new Uint16Array(this.primitive_data.line_index_array);

    this.gl_ctx.useProgram(this.gl_program_map.line_default);

    this.gl_ctx.bindBuffer(this.gl_ctx.ARRAY_BUFFER,
                           this.gl_buffer_map.line_f32);

    this.gl_ctx.bufferData(this.gl_ctx.ARRAY_BUFFER,
                           f32_attr_buffer,this.gl_ctx.STATIC_DRAW);

    var stride = 28;
    var offset = 0;

    this.gl_ctx.enableVertexAttribArray(this.gl_attr_loc.line_pos);
    this.gl_ctx.vertexAttribPointer(this.gl_attr_loc.line_pos,3,
                                    this.gl_ctx.FLOAT,false,stride,offset);

    offset += 12;
    this.gl_ctx.enableVertexAttribArray(this.gl_attr_loc.line_next_pos);
    this.gl_ctx.vertexAttribPointer(this.gl_attr_loc.line_next_pos,3,
                                    this.gl_ctx.FLOAT,false,stride,offset);

    offset += 12;
    this.gl_ctx.enableVertexAttribArray(this.gl_attr_loc.line_displacement);
    this.gl_ctx.vertexAttribPointer(this.gl_attr_loc.line_displacement,1,
                                   this.gl_ctx.FLOAT,false,stride,offset);


    this.gl_ctx.bindBuffer(this.gl_ctx.ARRAY_BUFFER,
                           this.gl_buffer_map.line_uint8);

    this.gl_ctx.bufferData(this.gl_ctx.ARRAY_BUFFER,
                           ui8_attr_buffer,this.gl_ctx.STATIC_DRAW);

    this.gl_ctx.enableVertexAttribArray(this.gl_attr_loc.line_color);
    this.gl_ctx.vertexAttribPointer(this.gl_attr_loc.line_color,3,
                                    this.gl_ctx.UNSIGNED_BYTE,true,0,0);


    this.gl_ctx.bindBuffer(this.gl_ctx.ELEMENT_ARRAY_BUFFER,
                           this.gl_buffer_map.line_indices);

    this.gl_ctx.bufferData(this.gl_ctx.ELEMENT_ARRAY_BUFFER,
                           index_buffer,this.gl_ctx.STATIC_DRAW);
  };

  // reset line data, recollect data from remaining lines
  this.collect_line_data = function()
  {
    var line_array = this.primitive_list.line_array;
    var line       = null;

    // reset line f32 attribute, index array
    this.primitive_data.line_f32_attr    = [];
    this.primitive_data.line_uint8_attr  = [];
    this.primitive_data.line_index_array = [];

    // for every line
    for(var line_index = 0 ; line_index < line_array.length ; ++line_index)
    {
      // get current line
      line = line_array[line_index];

      // add current vertex attributes to collection
      this.primitive_data.line_f32_attr =
      this.primitive_data.line_f32_attr.concat(line.vertex_f32_attr);

      this.primitive_data.line_uint8_attr =
      this.primitive_data.line_uint8_attr.concat(line.vertex_uint8_attr);

      // add current index array to collection
      this.primitive_data.line_index_array =
      this.primitive_data.line_index_array.concat(line.index_array);
    }
  }

  // important after line removal, reset index range for every line
  this.update_line_index_arrays = function()
  {
    var line_array   = this.primitive_list.line_array;
    var index_array  = null;
    var line         = null;
    var index_number = 0;

    // for every line
    for(var line_index = 0 ; line_index < line_array.length ; ++line_index)
    {
      // get current line
      line = line_array[line_index];

      index_number = line_index * 4;
      index_array  = [index_number,index_number + 1,index_number + 2,
                      index_number,index_number + 2,index_number + 3 ];

      line.index_array = index_array;
    }
  };

  // change color after line initialization
  this.set_line_color = function(line_index,c1,c2)
  {
    // invalid line index
    if(typeof line_index != 'number' ||
       line_index <  0                ||
       line_index >= this.primitive_list.line_array.length)
    {
      console.log('canvas: invalid line index');
      console.log('canvas: line removal failed');
      return;
    }

    c1 = ivec3.get_array(c1);
    c2 = ivec3.get_array(c2);

    var line = this.primitive_list.line_array[line_index];

    // container for everey vertex attribute with type uint8
    // vertex [color(uint8)]
    var vertex_uint8_attr = [];

    vertex_uint8_attr = vertex_uint8_attr.concat(c1);
    vertex_uint8_attr = vertex_uint8_attr.concat(c1);
    vertex_uint8_attr = vertex_uint8_attr.concat(c2);
    vertex_uint8_attr = vertex_uint8_attr.concat(c2);

    line.vertex_uint8_attr = vertex_uint8_attr;

    this.collect_line_data();
    this.upload_line_data();
  };

  // draw all stored lines to the canvas
  this.draw_arrow_glyph_primitives = function()
  {
    this.upload_arrow_glyph_data();

    var pv  = this.gl_uniform_map.perspective_view_matrix;
    var loc = this.gl_uniform_loc.arrow_glyph_pv;

    pv = mat4.transpose(pv);
    this.gl_ctx.uniformMatrix4fv(loc,false,pv);

    loc = this.gl_uniform_loc.arrow_glyph_aspect_ratio;
    this.gl_ctx.uniform1f(loc,this.gl_uniform_map.aspect_ratio);

    //this.gl_ctx.clearColor(0.0,0.0,0.0,1.0);
    //this.gl_ctx.clear(this.gl_ctx.COLOR_BUFFER_BIT);

    var arrow_glyph_number = this.primitive_list.arrow_glyph_array.length;
    var vertex_number = arrow_glyph_number * 6;

    this.gl_ctx.drawArrays(this.gl_ctx.TRIANGLES,0,vertex_number);
  }

  // load arrow glyph, calculate vertex attributes
  this.load_arrow_glyph = function(pos,dir,color)
  {
    if(!vec3.valid_vector(pos))
    {
      console.log('canvas: position argument is no valid vector');
      console.log('canvas: arrow glyph calculation failed');
      return;
    }

    if(!vec2.valid_vector(dir))
    {
      console.log('canvas: direction argument is no valid vector');
      console.log('canvas: arrow glyph calculation failed');
      return;
    }

    // container for everey vertex attribute with type float32
    // vertex [position(vec3),direction(vec2),displacmenet(f32),arrow_dist(f32)]
    var vertex_f32_attr = [];

    // container for everey vertex attribute with type uint8
    // vertex [color(uint8 vec3)]
    var vertex_uint8_attr = [];

    var pos_array   = vec3.get_array(pos);
    var dir_array   = vec2.get_array(dir);
    var color_array = ivec3.get_array(color);

    var default_displacement  = 0.03;
    var default_peak_distance = 0.1;

    var displacement          = 0.0;
    var peak_distance         = 0.0;

    // assemble the three different vertices of the line
    for(var vertex_number = 1 ; vertex_number < 7 ; ++vertex_number)
    {
      vertex_f32_attr = vertex_f32_attr.concat(pos_array);
      vertex_f32_attr = vertex_f32_attr.concat(dir_array);

      if(vertex_number == 1)
      {
        displacement  = 0.0;
        peak_distance = 0.0;
      }

      else if(vertex_number < 6)
      {
        displacement  = default_displacement;
        peak_distance = default_peak_distance;
      }

      else
      {
        displacement  = 0.0;
        peak_distance = default_peak_distance * 1.2;
      }

      vertex_f32_attr.push(displacement);
      vertex_f32_attr.push(peak_distance);

      vertex_uint8_attr = vertex_uint8_attr.concat(color_array);

      default_displacement *= -1.0;
    }

    // store arrow glyph data
    var arrow_glyph = {'pos':pos,'dir':dir,'color':color,
                       'vertex_f32_attr':vertex_f32_attr,
                       'vertex_uint8_attr':vertex_uint8_attr};

    this.primitive_list.arrow_glyph_array.push(arrow_glyph);

    // store WebGL primitive data
    this.primitive_data.arrow_glyph_f32_attr =
    this.primitive_data.arrow_glyph_f32_attr.concat(vertex_f32_attr);

    this.primitive_data.arrow_glyph_uint8_attr =
    this.primitive_data.arrow_glyph_uint8_attr.concat(vertex_uint8_attr);

    // upload arrow glyph data to GPU
    this.upload_arrow_glyph_data();
  }

  // load arrow glyüph attributes and indices on GPU, define memory layout
  this.upload_arrow_glyph_data = function()
  {
    var f32_attr_buffer =
    new Float32Array(this.primitive_data.arrow_glyph_f32_attr);

    var ui8_attr_buffer =
    new Uint8Array(this.primitive_data.arrow_glyph_uint8_attr);

    this.gl_ctx.useProgram(this.gl_program_map.arrow_glyph_default);

    this.gl_ctx.bindBuffer(this.gl_ctx.ARRAY_BUFFER,
                           this.gl_buffer_map.arrow_glyph_f32);

    this.gl_ctx.bufferData(this.gl_ctx.ARRAY_BUFFER,
                           f32_attr_buffer,this.gl_ctx.STATIC_DRAW);

    var stride = 28;
    var offset = 0;

    var loc  = this.gl_attr_loc.arrow_glyph_pos;
    var type = this.gl_ctx.FLOAT;
    this.gl_ctx.enableVertexAttribArray(loc);
    this.gl_ctx.vertexAttribPointer(loc,3,type,false,stride,offset);

    loc     = this.gl_attr_loc.arrow_glyph_dir;
    offset += 12;
    this.gl_ctx.enableVertexAttribArray(loc);
    this.gl_ctx.vertexAttribPointer(loc,2,type,false,stride,offset);

    loc     = this.gl_attr_loc.arrow_glyph_displacement;
    offset += 8;
    this.gl_ctx.enableVertexAttribArray(loc);
    this.gl_ctx.vertexAttribPointer(loc,1,type,false,stride,offset);

    loc     = this.gl_attr_loc.arrow_glyph_peak_distance;
    offset += 4;
    this.gl_ctx.enableVertexAttribArray(loc);
    this.gl_ctx.vertexAttribPointer(loc,1,type,false,stride,offset);

    this.gl_ctx.bindBuffer(this.gl_ctx.ARRAY_BUFFER,
                           this.gl_buffer_map.arrow_glyph_uint8);

    this.gl_ctx.bufferData(this.gl_ctx.ARRAY_BUFFER,
                           ui8_attr_buffer,this.gl_ctx.STATIC_DRAW);

    loc  = this.gl_attr_loc.arrow_glyph_color;
    type = this.gl_ctx.UNSIGNED_BYTE;
    this.gl_ctx.enableVertexAttribArray(loc);
    this.gl_ctx.vertexAttribPointer(loc,3,type,true,0,0);
  };
}

function mouse_wheel_event(mouse_event)
{
  var s = mouse_event.detail / -100.0;

  canvas.scale(s);

  canvas.draw_line_primitives();
  canvas.draw_arrow_glyph_primitives();
}

function mouse_down_event(mouse_event)
{
  canvas.event_attr.mouse_down = true;

  canvas.event_attr.mouse_pos[0] = mouse_event.clientX;
  canvas.event_attr.mouse_pos[1] = mouse_event.clientY;
}

function mouse_move_event(mouse_event)
{
  if(canvas.event_attr.mouse_down)
  {
    var v_t = new Float32Array([0.0,0.0,0.0]);

    v_t[0]  = (mouse_event.clientX - canvas.event_attr.mouse_pos[0])
              / canvas.view_attr.scale;
    v_t[1]  = (canvas.event_attr.mouse_pos[1] - mouse_event.clientY)
              / canvas.view_attr.scale;

    canvas.translate(v_t);

    canvas.draw_line_primitives();
    canvas.draw_arrow_glyph_primitives();

    canvas.event_attr.mouse_pos[0] = mouse_event.clientX;
    canvas.event_attr.mouse_pos[1] = mouse_event.clientY;
  }
}

function mouse_up_event(mouse_event)
{
  canvas.event_attr.mouse_down = false;
}
